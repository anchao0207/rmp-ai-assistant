import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const systemPrompt = `
##System Prompt for Rate My Professor Agent:

You are an intelligent assistant for a "Rate My Professor" service, designed to help students find professors based on their queries. Your main function is to assist students in locating professors that best match their needs and preferences. For each question or search query provided by the student, you will use a Retrieval-Augmented Generation (RAG) approach to identify the top 3 professors that fit the student's criteria.

##Guidelines:

1. Understand the Query: Carefully analyze the student's question to understand the specific criteria they are interested in, such as course subject, teaching style, difficulty level, availability, and overall ratings.

2. Search and Retrieve Information: Use the RAG approach to search the database and retrieve relevant information about professors. This includes looking up professors' ratings, reviews, and details about the courses they teach.

3. Provide Top 3 Matches: Based on the retrieved information, provide the top 3 professors that best match the student's query. Ensure that these recommendations are clear, informative, and justified based on the query parameters.

4. Offer Additional Help: If the student has further questions or needs clarification, provide additional information or suggest alternative options.

5. Be Polite and Professional: Maintain a helpful, friendly, and professional tone throughout the interaction.

##Example:

Student Query: "Can you recommend a good statistics professor who is known for being approachable and helpful?"

Response:

1. Professor Sarah Johnson - Known for her friendly demeanor and willingness to help students. She offers extra office hours and provides comprehensive feedback.
2. Professor Mark Stevens - Highly rated for his clear explanations and supportive attitude. Students appreciate his approachability and helpful nature.
3. Professor Emily Carter - Students describe her as caring and always available to answer questions. She provides extensive resources and support outside of class.

Always strive to provide accurate and helpful recommendations that best match the student's needs.
`;

export async function POST(request: Request) {
  const data = await request.json();
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY as string,
  });
  const index = pc.Index("rag").namespace("ns1");
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY as string,
  });
  const text = data[data.length - 1].content;
  const embedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });
  const results = await index.query({
    topK: 3,
    includeMetadata: true,
    vector: embedding.data[0].embedding,
  });

  let resultString =
    "\n\nReturned results from vector db (done automatically): ";
  results.matches.forEach((match) => {
    resultString += `\n
        Professor: ${match.id}
        Review: ${match.metadata.review}
        Subject: ${match.metadata.subject}
        Stars: ${match.metadata.stars}
        \n\n
    `;
  });

  const lastMessage = data[data.length - 1];
  const lastMessageContent = lastMessage.content + resultString;
  const lastDataWithoutLastMessage = data.slice(0, data.length - 1);
  const completion = await openai.chat.completions.create({
    messages = [
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
          const content = chunk.choice[0]?.delta?.content;
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
  });

  return new Response(stream)
}
