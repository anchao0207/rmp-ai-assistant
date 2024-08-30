"use client";

import Image from "next/image";
import "./globals.css";
import { useState, useRef } from "react";
import Link from "next/link";

function ChatBubble({
  message,
}: {
  message: { role: string; content: string };
}) {
  return (
    <li
      className={`flex ${
        message.role === "assistant" ? "" : "max-w-2xl ms-auto justify-end"
      } gap-x-2 sm:gap-x-4`}
    >
      {message.role === "assistant" ? (
        <svg
          className="shrink-0 size-[38px] rounded-full"
          width="38"
          height="38"
          viewBox="0 0 38 38"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="38" height="38" rx="6" fill="#2563EB" />
          <path
            d="M10 28V18.64C10 13.8683 14.0294 10 19 10C23.9706 10 28 13.8683 28 18.64C28 23.4117 23.9706 27.28 19 27.28H18.25"
            stroke="white"
            strokeWidth="1.5"
          />
          <path
            d="M13 28V18.7552C13 15.5104 15.6863 12.88 19 12.88C22.3137 12.88 25 15.5104 25 18.7552C25 22 22.3137 24.6304 19 24.6304H18.25"
            stroke="white"
            strokeWidth="1.5"
          />
          <ellipse cx="19" cy="18.6554" rx="3.75" ry="3.6" fill="white" />
        </svg>
      ) : null}
      {message.content ? (
        message.role === "assistant" ? (
          <div className="grow max-w-[90%] md:max-w-2xl w-full space-y-3">
            {/* <!-- Card --> */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 dark:bg-neutral-900 dark:border-neutral-700">
              {message.content.split("\n").map((content) => {
                if (content === "") {
                  return <br />;
                } else {
                  return (
                    <p
                      key={content}
                      className="text-sm text-gray-800 dark:text-white"
                    >
                      {content.split("**").map((sub, index) => {
                        return index % 2 === 0 ? sub : <b>{sub}</b>;
                      })}
                    </p>
                  );
                }
              })}
            </div>
          </div>
        ) : (
          <div className="grow text-end space-y-3">
            {/* <!-- Card --> */}
            <div className="inline-block bg-blue-600 rounded-lg p-4 shadow-sm">
              <p className="text-sm text-white">{message.content}</p>
            </div>
            {/* <!-- End Card --> */}
          </div>
        )
      ) : null}

      {message.role === "assistant" ? null : (
        <span className="shrink-0 inline-flex items-center justify-center size-[38px] rounded-full bg-gray-600">
          <span className="text-sm font-medium text-white leading-none">
            AT
          </span>
        </span>
      )}
    </li>
  );
}
export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm the Rate My Professor support assistant. How can I help you today?",
    },
  ]);
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [criteria, setCriteria] = useState({
    professor: "",
    university: "",
    subject: "",
    course: "",
  } as {[key:string]:string});

  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const sendMessage = async () => {
    if (!message) return;

    setMessage("");
    setMessages((messages) => [
      ...messages,
      { role: "user", content: message },
      { role: "assistant", content: "" },
    ]);

    const response = fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: [...messages, { role: "user", content: message }],
        filter: criteria,
      }),
    })
      .then(async (res) => {
        if (!res.body) {
          throw new Error("Response body is missing");
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let result = "";

        return reader.read().then(function processText({ done, value }) : string | Promise<string>{
          if (done) {
            return result;
          }
          const text = decoder.decode(value || new Uint8Array(), {
            stream: true,
          });
          // console.log(String.raw`${text}\n`);
          setMessages((messages) => {
            let lastMessage = messages[messages.length - 1];
            let otherMessages = messages.slice(0, messages.length - 1);
            return [
              ...otherMessages,
              { ...lastMessage, content: lastMessage.content + text },
            ];
          });
          return reader.read().then(processText);
        });
      })
      .catch((error) => {
        console.error("An error occurred:", error);
      });
  };

  const addProfessor = async () => {
    if (!url) return;
    const response = await fetch("/api/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: url }),
    }).then((res) => {
      console.log(res.status);
    });
  };

  return (
    <div className="relative w-screen h-screen flex flex-col justify-between">
      <div className="max-w-4xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14 mx-auto">
        {/* <!-- Title --> */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 sm:text-4xl dark:text-white">
            Welcome to RateMyProfessor AI
          </h1>
          <p className="mt-3 text-gray-600 dark:text-neutral-400">
            Your AI-powered copilot for the web
          </p>
        </div>
        {/* <!-- End Title --> */}

        <ul className="mt-16 space-y-5">
          {messages.map((message, index) => (
            <ChatBubble key={index} message={message} />
          ))}
        </ul>
      </div>

      <div className="w-full mx-auto sticky bottom-0 z-10 sm:pt-4 sm:pb-6 px-4 sm:px-6 lg:px-0 ">
        {/* <!-- Textarea --> */}
        <div className="max-w-4xl mx-auto rounded-2xl px-4 py-4 sm:px-6 lg:px-8 bg-white border-t border-gray-200 dark:bg-neutral-900 dark:border-neutral-700">
          <div className="flex justify-between items-center mb-3">
            <div className="hs-dropdown relative inline-flex">
              <button
                type="button"
                className="hs-dropdown-toggle inline-flex justify-center items-center gap-x-2 rounded-lg font-medium text-gray-800 hover:text-blue-600 focus:outline-none focus:text-blue-600 text-xs sm:text-sm dark:text-neutral-200 dark:hover:text-blue-500 dark:focus:text-blue-500"
                aria-haspopup="dialog"
                aria-expanded="false"
                aria-controls="hs-scale-animation-modal"
                data-hs-overlay="#hs-scale-animation-modal"
                // onClick={() => {
                //   setMessages([
                //     {
                //       role: "assistant",
                //       content:
                //         "Hi! I'm the Rate My Professor support assistant. How can I help you today?",
                //     },
                //   ]);
                //   setMessage("");
                // }}
              >
                <svg
                  className="shrink-0 size-4"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="M12 5v14" />
                </svg>
                Criteria
                <div className="font-medium text-xs italic">
                  Filtering:{" "}
                  {Object.keys(criteria).map((key) => {
                    if (criteria[key]) {
                      return `${key}: ${criteria[key]} `;
                    }
                  })}
                </div>
              </button>
              <div
                id="hs-scale-animation-modal"
                className="hs-overlay hidden size-full fixed top-0 start-0 z-[80] overflow-x-hidden overflow-y-auto pointer-events-none"
                role="dialog"
                tabIndex={-1}
                aria-labelledby="hs-scale-animation-modal-label"
              >
                <div className="hs-overlay-animation-target hs-overlay-open:scale-100 hs-overlay-open:opacity-100 scale-95 opacity-0 ease-in-out transition-all duration-200 sm:max-w-lg sm:w-full m-3 sm:mx-auto min-h-[calc(100%-3.5rem)] flex items-center">
                  <div className="w-full flex flex-col bg-white border shadow-sm rounded-xl pointer-events-auto dark:bg-neutral-800 dark:border-neutral-700 dark:shadow-neutral-700/70">
                    <div className="flex justify-between items-center py-3 px-4 border-b dark:border-neutral-700">
                      <h3
                        id="hs-scale-animation-modal-label"
                        className="font-bold text-gray-800 dark:text-white"
                      >
                        Filter search
                      </h3>
                      <button
                        type="button"
                        className="size-8 inline-flex justify-center items-center gap-x-2 rounded-full border border-transparent bg-gray-100 text-gray-800 hover:bg-gray-200 focus:outline-none focus:bg-gray-200 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-neutral-400 dark:focus:bg-neutral-600"
                        aria-label="Close"
                        data-hs-overlay="#hs-scale-animation-modal"
                      >
                        <span className="sr-only">Close</span>
                        <svg
                          className="shrink-0 size-4"
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M18 6 6 18"></path>
                          <path d="m6 6 12 12"></path>
                        </svg>
                      </button>
                    </div>
                    <div className="p-4 overflow-y-auto">
                      <p className="mt-1 text-gray-800 dark:text-neutral-400">
                        Please enter the filter values you want to search within
                        the context. You can leave the other fields blank.
                      </p>
                    </div>
                    <div className="p-4 space-y-3">
                      <input
                        type="text"
                        className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600"
                        placeholder="Professor"
                        value={criteria.professor}
                        onChange={(e) =>
                          setCriteria({
                            ...criteria,
                            professor: e.target.value,
                          })
                        }
                      />
                      <input
                        type="text"
                        className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600"
                        placeholder="University"
                        value={criteria.university}
                        onChange={(e) =>
                          setCriteria({
                            ...criteria,
                            university: e.target.value,
                          })
                        }
                      />
                      <input
                        type="text"
                        className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600"
                        placeholder="Subject"
                        value={criteria.subject}
                        onChange={(e) =>
                          setCriteria({ ...criteria, subject: e.target.value })
                        }
                      />
                      <input
                        type="text"
                        className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600"
                        placeholder="Course"
                        value={criteria.course}
                        onChange={(e) =>
                          setCriteria({ ...criteria, course: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex justify-end items-center gap-x-2 py-3 px-4 border-t dark:border-neutral-700">
                      <button
                        type="button"
                        className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-700 dark:focus:bg-neutral-700"
                        data-hs-overlay="#hs-scale-animation-modal"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="py-1.5 px-2 inline-flex items-center gap-x-2 text-xs font-medium rounded-lg border transition-all border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-800 dark:focus:bg-neutral-800"
              aria-expanded="false"
              aria-controls="hs-slide-down-animation-modal"
              data-hs-overlay="#hs-slide-down-animation-modal"
            >
              <svg
                className="size-4"
                xmlns="http://www.w3.org/2000/svg"
                height="16"
                viewBox="0 -960 960 960"
                width="16"
                fill="currentColor"
              >
                <path d="M680-160v-120H560v-80h120v-120h80v120h120v80H760v120h-80ZM440-280H280q-83 0-141.5-58.5T80-480q0-83 58.5-141.5T280-680h160v80H280q-50 0-85 35t-35 85q0 50 35 85t85 35h160v80ZM320-440v-80h320v80H320Zm560-40h-80q0-50-35-85t-85-35H520v-80h160q83 0 141.5 58.5T880-480Z" />
              </svg>
              Upload professors data
            </button>
            <div
              id="hs-slide-down-animation-modal"
              className="hs-overlay bg-gray-600/50 hidden size-full fixed top-0 start-0 z-[80] overflow-x-hidden overflow-y-auto pointer-events-none"
              role="dialog"
              tabIndex={-1}
              aria-labelledby="hs-slide-down-animation-modal-label"
            >
              <div className="hs-overlay-animation-target hs-overlay-open:mt-7 hs-overlay-open:opacity-100 hs-overlay-open:duration-500 mt-0 opacity-0 ease-out transition-all sm:max-w-lg sm:w-full m-3 sm:mx-auto min-h-[calc(100%-3.5rem)] flex items-center">
                <div className="flex flex-col bg-white border shadow-sm rounded-xl pointer-events-auto dark:bg-neutral-800 dark:border-neutral-700 dark:shadow-neutral-700/70">
                  <div className="flex justify-between items-center py-3 px-4 border-b dark:border-neutral-700">
                    <h3
                      id="hs-slide-down-animation-modal-label"
                      className="font-bold text-gray-800 dark:text-white"
                    >
                      Add professor data
                    </h3>
                    <button
                      type="button"
                      className="size-8 inline-flex justify-center items-center gap-x-2 rounded-full border border-transparent bg-gray-100 text-gray-800 hover:bg-gray-200 focus:outline-none focus:bg-gray-200 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-neutral-400 dark:focus:bg-neutral-600"
                      aria-label="Close"
                      data-hs-overlay="#hs-slide-down-animation-modal"
                    >
                      <span className="sr-only">Close</span>
                      <svg
                        className="shrink-0 size-4"
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 6 6 18"></path>
                        <path d="m6 6 12 12"></path>
                      </svg>
                    </button>
                  </div>
                  <div className="p-4 overflow-y-auto">
                    <p className="mt-1 text-gray-800 dark:text-neutral-400">
                      Please submit the professor data by entering the url from{" "}
                      <Link
                        className="hover:underline"
                        target="_blank"
                        href="https://www.ratemyprofessors.com/"
                      >
                        https://www.ratemyprofessors.com/
                      </Link>
                    </p>
                  </div>
                  <div className="p-4 pt-0">
                    <input
                      id="hs-content-for-copy"
                      type="url"
                      pattern="https://www.ratemyprofessors.com/professor/[0-9]+"
                      className="peer [.validated_&]:invalid:border-pink-600 [.validated_&]:invalid:ring-2 [.validated_&]:invalid:ring-pink-200 text-gray-800 dark:text-neutral-400 bg-white dark:bg-neutral-600 py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none"
                      placeholder="Enter Url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      required
                    />
                    <span className="mt-2 hidden text-sm text-red-500 peer-[&:not(:placeholder-shown):not(:focus):invalid]:block">
                      Please enter a valid url from{" "}
                      <Link
                        className="hover:underline"
                        target="_blank"
                        href="https://www.ratemyprofessors.com/"
                      >
                        https://www.ratemyprofessors.com/
                      </Link>
                    </span>
                  </div>

                  <div className="flex justify-end items-center gap-x-2 py-3 px-4 border-t dark:border-neutral-700">
                    <button
                      type="button"
                      className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-700 dark:focus:bg-neutral-700"
                      data-hs-overlay="#hs-slide-down-animation-modal"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
                      data-hs-overlay="#hs-slide-down-animation-modal"
                      onClick={() => {
                        addProfessor();
                      }}
                    >
                      Save changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* <!-- Input --> */}
          <div className="relative">
            <textarea
              className="p-4 pb-12 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600"
              placeholder="Ask me anything..."
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  buttonRef.current?.click();
                }
              }}
            ></textarea>

            {/* <!-- Toolbar --> */}
            <div className="absolute bottom-px inset-x-px p-2 rounded-b-lg bg-white dark:bg-neutral-900">
              <div className="flex justify-between items-center">
                {/* <!-- Button Group --> */}
                <div className="flex items-center">
                  {/* <!-- Mic Button --> */}
                  <button
                    type="button"
                    className="inline-flex shrink-0 justify-center items-center size-8 rounded-lg text-gray-500 hover:bg-gray-100 focus:z-10 focus:outline-none focus:bg-gray-100 dark:text-neutral-500 dark:hover:bg-neutral-700 dark:focus:bg-neutral-700"
                  >
                    <svg
                      className="shrink-0 size-4"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="18" height="18" x="3" y="3" rx="2" />
                      <line x1="9" x2="15" y1="15" y2="9" />
                    </svg>
                  </button>
                  {/* <!-- End Mic Button --> */}

                  {/* <!-- Attach Button --> */}
                  <button
                    type="button"
                    className="inline-flex shrink-0 justify-center items-center size-8 rounded-lg text-gray-500 hover:bg-gray-100 focus:z-10 focus:outline-none focus:bg-gray-100 dark:text-neutral-500 dark:hover:bg-neutral-700 dark:focus:bg-neutral-700"
                  >
                    <svg
                      className="shrink-0 size-4"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                  </button>
                  {/* <!-- End Attach Button --> */}
                </div>
                {/* <!-- End Button Group --> */}

                {/* <!-- Button Group --> */}
                <div className="flex items-center gap-x-1">
                  {/* <!-- Mic Button --> */}
                  <button
                    type="button"
                    className="inline-flex shrink-0 justify-center items-center size-8 rounded-lg text-gray-500 hover:bg-gray-100 focus:z-10 focus:outline-none focus:bg-gray-100 dark:text-neutral-500 dark:hover:bg-neutral-700 dark:focus:bg-neutral-700"
                  >
                    <svg
                      className="shrink-0 size-4"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" x2="12" y1="19" y2="22" />
                    </svg>
                  </button>
                  {/* <!-- End Mic Button --> */}

                  {/* <!-- Send Button --> */}
                  <button
                    type="button"
                    className="inline-flex shrink-0 justify-center items-center size-8 rounded-lg text-white bg-blue-600 hover:bg-blue-500 focus:z-10 focus:outline-none focus:bg-blue-500"
                    onClick={() => sendMessage()}
                    ref={buttonRef}
                  >
                    <svg
                      className="shrink-0 size-3.5"
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855H.766l-.452.18a.5.5 0 0 0-.082.887l.41.26.001.002 4.995 3.178 3.178 4.995.002.002.26.41a.5.5 0 0 0 .886-.083l6-15Zm-1.833 1.89L6.637 10.07l-.215-.338a.5.5 0 0 0-.154-.154l-.338-.215 7.494-7.494 1.178-.471-.47 1.178Z" />
                    </svg>
                  </button>
                  {/* <!-- End Send Button --> */}
                </div>
                {/* <!-- End Button Group --> */}
              </div>
            </div>
            {/* <!-- End Toolbar --> */}
          </div>
          {/* <!-- End Input --> */}
        </div>
        {/* <!-- End Textarea --> */}
      </div>
    </div>
  );
}
