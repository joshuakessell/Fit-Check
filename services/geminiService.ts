/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { urlToFile } from "../lib/utils";

const fileToPart = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
};

const dataUrlToParts = (dataUrl: string) => {
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    return { mimeType: mimeMatch[1], data: arr[1] };
}

const dataUrlToPart = (dataUrl: string) => {
    const { mimeType, data } = dataUrlToParts(dataUrl);
    return { inlineData: { mimeType, data } };
}

const handleApiResponse = (response: GenerateContentResponse): string => {
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        throw new Error(errorMessage);
    }

    for (const candidate of response.candidates ?? []) {
        const imagePart = candidate.content?.parts?.find(part => part.inlineData);
        if (imagePart?.inlineData) {
            const { mimeType, data } = imagePart.inlineData;
            return `data:${mimeType};base64,${data}`;
        }
    }

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
        throw new Error(errorMessage);
    }
    const textFeedback = response.text?.trim();
    const errorMessage = `The AI model did not return an image. ` + (textFeedback ? `The model responded with text: "${textFeedback}"` : "This can happen due to safety filters or if the request is too complex. Please try a different image.");
    throw new Error(errorMessage);
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
const imageModel = 'gemini-2.5-flash-image-preview';
const textModel = 'gemini-2.5-flash';

export const generateModelImage = async (userImage: File): Promise<string> => {
    const userImagePart = await fileToPart(userImage);
    const prompt = "You are an expert fashion photographer AI. Transform the person in this image into a full-body fashion model photo suitable for an e-commerce website. The background must be a clean, neutral studio backdrop (light gray, #f0f0f0). The person should have a neutral, professional model expression. Preserve the person's identity, unique features, and body type, but place them in a standard, relaxed standing model pose. The final image must be photorealistic. Return ONLY the final image.";
    const response = await ai.models.generateContent({
        model: imageModel,
        contents: { parts: [userImagePart, { text: prompt }] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
};

export const categorizeGarment = async (garmentImage: File): Promise<'top' | 'bottom'> => {
  const garmentImagePart = await fileToPart(garmentImage);
  const prompt = "Analyze the clothing item in this image. Is it worn on the upper body (a 'top') or the lower body (a 'bottom')? It can also be underwear. Respond with only the word 'top' or 'bottom'.";
  const response = await ai.models.generateContent({
    model: imageModel,
    contents: { parts: [garmentImagePart, { text: prompt }] },
  });
  const category = response.text.trim().toLowerCase();
  if (category === 'top' || category === 'bottom') {
    return category;
  }
  throw new Error(`Could not categorize garment. Model returned: "${category}"`);
};

export const validateInput = async (input: string, type: 'expression' | 'background'): Promise<boolean> => {
    const prompt = `Is "${input}" a valid and safe description for a person's facial ${type === 'expression' ? 'expression' : 'scene background'}? The description must not be a person, place, or thing that is copyrighted. Respond with only 'yes' or 'no'.`;
    const response = await ai.models.generateContent({
        model: textModel,
        contents: prompt,
    });
    return response.text.trim().toLowerCase() === 'yes';
};

export const generateCompositeImage = async (
    baseModelUrl: string,
    poseInstruction: string,
    top?: { url: string; name: string; activeColor?: string },
    bottom?: { url: string; name: string; activeColor?: string },
    expression?: string,
    background?: string
): Promise<string> => {
    const modelImagePart = dataUrlToPart(baseModelUrl);
    const parts: any[] = [modelImagePart];

    let prompt = "You are an expert virtual try-on AI. You will be given a 'model image' and potentially a 'top garment' and/or a 'bottom garment'. Your task is to create a new photorealistic image with several modifications.\n\n**Crucial Rules:**\n1.  **Preserve the Model's Identity:** The person's face (unless expression is changed), hair, and unique features MUST be preserved.\n2.  **Output:** Return ONLY the final, edited image. Do not include any text.\n\n**Instructions:**\n";

    if (top) {
        const topFile = await urlToFile(top.url, top.name);
        const topImagePart = await fileToPart(topFile);
        parts.push({text: "\n--- Top Garment Image --- \n"}, topImagePart);
        prompt += `- **Apply Top Garment:** Realistically fit the 'top garment' onto the person. It should adapt to their pose with natural folds, shadows, and lighting. Replace any existing upper-body clothing.\n`;
        if (top.activeColor) {
            prompt += `  - **Top Color:** The final color of the top garment must be exactly this color: ${top.activeColor}. Maintain texture and lighting.\n`;
        }
    }
     if (bottom) {
        const bottomFile = await urlToFile(bottom.url, bottom.name);
        const bottomImagePart = await fileToPart(bottomFile);
        parts.push({text: "\n--- Bottom Garment Image --- \n"}, bottomImagePart);
        prompt += `- **Apply Bottom Garment:** Realistically fit the 'bottom garment' onto the person. Replace any existing lower-body clothing.\n`;
        if (bottom.activeColor) {
            prompt += `  - **Bottom Color:** The final color of the bottom garment must be exactly this color: ${bottom.activeColor}. Maintain texture and lighting.\n`;
        }
    }

    prompt += `- **Pose:** The model's final pose must be: "${poseInstruction}".\n`;
    
    if (expression && expression !== 'Default') {
        prompt += `- **Facial Expression:** Change the model's facial expression to be convincingly '${expression}'.\n`;
    }

    if (background && background !== 'Original Studio') {
        prompt += `- **Background:** Replace the entire background with a photorealistic scene of a '${background}'. The lighting on the model must match the new background.\n`;
    } else {
        prompt += `- **Preserve Background:** The original background from the 'model image' MUST be preserved perfectly.\n`;
    }

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
        model: imageModel,
        contents: { parts },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    return handleApiResponse(response);
};
