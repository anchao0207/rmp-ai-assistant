import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const systemPrompt = `
##System Prompt for Rate My Professor Agent:

You are an intelligent assistant for a "Rate My Professor" service, designed to help students find professors based on their queries. Your main function is to assist students in locating professors that best match their needs and preferences. For each question or search query provided by the student, you will use a Retrieval-Augmented Generation (RAG) approach to identify the top 3 professors that fit the student's criteria.

##Guidelines:

1. Understand the Query: Carefully analyze the student's question to understand the specific criteria they are interested in, such as course subject, teaching style, difficulty level, availability, and overall ratings.

2. Search and Retrieve Information: Use the RAG approach to search the database and retrieve relevant information about professors. This includes looking up professors' ratings, reviews, and details about the courses they teach.

3. Provide at most Top 3 Matches: Based on the retrieved information, provide the top 3 professors that best match the student's query. Ensure that these recommendations are clear, informative, and justified based on the query parameters.

4. Only provide relavant information, if there's no match, apologize instead of provide unrelavant information.

5. Offer Additional Help: If the student has further questions or needs clarification, provide additional information or suggest alternative options.

6. Be Polite and Professional: Maintain a helpful, friendly, and professional tone throughout the interaction.

##Example:

Student Query: "Can you recommend a good statistics professor who is known for being approachable and helpful?"

##Response:

Here are three statistics professors known for being approachable and helpful based on your query:\

1. **Dr. Alice Johnson**
   - **Subject:** Calculus I (which often includes foundational concepts relevant to statistics)  
   - **Rating:** ⭐⭐⭐⭐⭐ (5 stars)  
   - **Review:** Dr. Johnson is highly praised for her ability to explain complex concepts clearly. She is always available for extra help and is known for her supportive teaching style.

2. **Professor Mark Stevens**
   - **Subject:** Introduction to Statistics  
   - **Rating:** ⭐⭐⭐⭐ (4 stars) (not in the returned results but a common suggestion)  
   - **Review:** Students appreciate Prof. Stevens for his friendly manner and encouraging approach. He answers questions thoughtfully and promotes a collaborative learning environment.

3. **Professor Jane Doe**
   - **Subject:** Applied Statistics  
   - **Rating:** ⭐⭐⭐⭐½ (4.5 stars) (again, a common suggestion)  
   - **Review:** Prof. Doe is known for her engaging lectures and willingness to assist students outside of class. Many students rave about her clarity in teaching statistical concepts.

These professors are recognized for their approachable nature and helpfulness. If you need more specific information or further recommendations, feel free to ask!

##Example:

Student Query: "I'm interested in finding a professor who is known for giving pop quizzes."

##Response:

Based on your interest in finding a professor who enjoys giving pop quizzes, here are three recommendations:\

1. **Prof. George Carter**
   - **Subject:** Art History  
   - **Rating:** ⭐⭐⭐⭐⭐ (5 stars)  
   - **Review:** Prof. Carter is known for his captivating lectures and engaging teaching style. While the focus is more on lectures, his approach may include frequent assessments to keep students engaged.

2. **Dr. Emily Brown**
   - **Subject:** Sociology of Media  
   - **Rating:** ⭐⭐⭐⭐ (4 stars)  
   - **Review:** Dr. Brown encourages a lot of class participation, which often includes spontaneous pop quizzes to encourage attendance and engagement. Students appreciate her fascinating course material.


While these professors may not be exclusively known for pop quizzes, their teaching styles include engaging assessments that keep students on their toes. If you need further recommendations or more specific details, feel free to ask!

##Final Requirements:
Don't give irrelevant information. Always strive to provide accurate and helpful recommendations that best match the student's needs. Give the response in Markdown Format.
`;

function clean(obj) {
  for (var propName in obj) {
    if (obj[propName] === null || obj[propName] === undefined || obj[propName] === "") {
      delete obj[propName];
    } else {
      obj[propName] = {
        '$eq': obj[propName]
      }
    }
  }

  return obj
}

export async function POST(request: Request) {

  const data = await request.json();
  const filter = clean({
    'professor': data.filter.professor,
    'subject': data.filter.subject,
    'course': data.filter.course,
    'university': data.filter.university
  })
  console.log(filter)
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY as string,
  });
  const index = pc.Index("rag").namespace("professor_reviews");
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY as string,
  });
  const text = data.text[data.text.length - 1].content;

  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });

  var results

  if (Object.keys(filter).length > 0) {
    results = await index.query({
      topK: 3,
      includeMetadata: true,
      filter: filter,
      vector: embedding.data[0].embedding,
    })
  } else {
    results = await index.query({
      topK: 3,
      includeMetadata: true,
      vector: embedding.data[0].embedding,
    })
  }

  let resultString =
    "\n\nReturned results from vector db (done automatically): ";
  results.matches.forEach((match) => {
    resultString += `\n
        Professor: ${match.metadata.professor}
        Review: ${match.metadata.review}
        Subject: ${match.metadata.subject}
        Stars: ${match.metadata.stars}
        \n\n
    `;
  });
  

  const lastMessage = data.text[data.text.length - 1];
  const lastMessageContent = lastMessage.content + resultString;
  const lastDataWithoutLastMessage = data.text.slice(0, data.text.length - 1);
  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      ...lastDataWithoutLastMessage,
      { role: "user", content: lastMessageContent },
    ],
    model: "gpt-4o-mini",
    stream: true,
  });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            const text = encoder.encode(content);
            controller.enqueue(text);
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  })

  return new NextResponse(stream);
}
