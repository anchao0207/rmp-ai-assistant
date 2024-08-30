import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const cheerio = require("cheerio");
const { createHash } = require("crypto");
function hash(string : String) {
  return createHash("sha256").update(string).digest("hex");
}
export async function POST(request: Request) {
  const data = await request.json();
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY as string,
  });
  const index = pc.Index("rag").namespace("professor_reviews");
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY as string,
  });

  const response = await fetch(data.url);
  const html = await response.text();
  const $ = cheerio.load(html);
  const info : { professor: string, subject: string, university: string, stars: number, difficulty: number, ratings: {[key:string]:string}[]} = {
    professor: $(".NameTitle__Name-dowf0z-0").text().trim(),
    subject: $(".TeacherDepartment__StyledDepartmentLink-fl79e8-0")
      .text()
      .replace("department", "")
      .trim(),
    university: $(".NameTitle__Title-dowf0z-1").find("a:last").text().trim(),
    stars: Math.round($(".RatingValue__Numerator-qw8sqy-2").text().trim()),
    difficulty: parseFloat(
      $(".FeedbackItem__FeedbackNumber-uof32n-1").text().trim()
    ),
    ratings: [],
  };

  $(".Rating__RatingBody-sc-1rhvpxz-0").map(function (this: Object) {
    let dict : {[key: string]: string | never}  = {};
    $(this)
      .find(".fVETNc")
      .map(function (this:Object) {
        dict[$(this).text().trim().toLowerCase()] = $(this)
          .next()
          .text()
          .trim();
      });
    // console.log($(this).find(".RatingHeader__StyledClass-sc-1dlkqw1-3"))
    dict["course"] = $(this)
      .find(".RatingHeader__StyledClass-sc-1dlkqw1-3:first")
      .text()
      .trim();
    dict["review"] = $(this)
      .find(".Comments__StyledComments-dzzyvm-0")
      .text()
      .trim();
    info.ratings.push(dict);
  });

  Promise.all(
    info.ratings.map(async (review) => {
      const embedding = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: review.review,
        encoding_format: "float",
      });
      return {
        id: hash(review.review),
        values: embedding.data[0].embedding,
        metadata: {
          subject: info.subject,
          stars: info.stars,
          review: review.review,
          professor: info.professor,
          university: info.university,
          course: review.course,
          difficulty: review.difficulty,
        },
      };
    })
  )
    .then(async (results) => {
      console.log("Successfully embedded data");
      try {
        await index.upsert(results).then(() => {
          console.log("Successfully upserted data");
          return new NextResponse("Success", { status: 200 });
        });
      } catch (upsertError) {
        console.error("Failed to upsert data", upsertError);
      }
    })
    .catch((err) => {
      console.error("Failed to embed data", err);
    });

  return new NextResponse("Failed", { status: 500 });
}
