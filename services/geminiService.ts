
import { GoogleGenAI } from "@google/genai";

// Queue management to strictly control API calls per minute
type QueueItem = {
  content: string;
  prompt: string;
  resolve: (value: string) => void;
  reject: (reason: any) => void;
  retries: number;
};

const queue: QueueItem[] = [];
let isProcessing = false;
const MAX_RETRIES = 1;
const MIN_REQUEST_GAP = 5000; // 5 seconds (12 requests per minute max)

const processQueue = async () => {
  if (isProcessing || queue.length === 0) return;
  isProcessing = true;

  const item = queue.shift()!;
  
  try {
    // Create fresh instance per recommendation to ensure latest key/config
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `${item.prompt}\n\n ${item.content.substring(0, 1500)}`,
      config: {
        temperature: 0.7,
        topP: 0.8,
      }
    });

    const text = response.text || "সারসংক্ষেপ পাওয়া যায়নি।";
    item.resolve(text);
    
    // Always wait after a successful request
    setTimeout(() => {
      isProcessing = false;
      processQueue();
    }, MIN_REQUEST_GAP);

  } catch (error: any) {
    const isRateLimit = error?.message?.includes('429') || error?.status === 429;
    
    if (isRateLimit && item.retries < MAX_RETRIES) {
      item.retries++;
      // Wait longer on 429 before trying again
      setTimeout(() => {
        queue.push(item);
        isProcessing = false;
        processQueue();
      }, MIN_REQUEST_GAP * 2);
    } else {
      item.reject(error);
      isProcessing = false;
      // Short rest before continuing with next items in queue
      setTimeout(processQueue, 2000);
    }
  }
};

/**
 * Summarizes article content using Gemini with strict queuing and retry logic.
 */
export const summarizeArticle = (content: string, prompt?: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    queue.push({
      content,
      prompt: prompt || "নীচের খবরের একটি সঠিক ২-লাইনের বাংলা সারসংক্ষেপ লিখুন:",
      resolve,
      reject,
      retries: 0
    });
    processQueue();
  });
};
