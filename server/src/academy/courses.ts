import { z } from "zod";
import prisma from "../utils/prisma.js";
import { course, quiz } from "./prospecting.js";

const text = (max: number) => z.string().trim().min(1).max(max);
export const courseInput = z.object({
  title: text(140),
  description: text(2000),
  durationMinutes: z.number().int().min(1).max(6000),
  lessons: z.array(z.object({
    title: text(140),
    paragraphs: z.array(text(12000)).min(1).max(20),
    resourceUrl: z.url({ protocol: /^https$/ }).max(2000).optional(),
  })).min(1).max(30),
  questions: z.array(z.object({
    prompt: text(500),
    options: z.array(text(300)).min(2).max(6),
    answer: z.number().int().min(0),
  }).refine(question => question.answer < question.options.length, "Sélectionnez une réponse correcte.")).min(1).max(30),
});

export const enrollment = "enrollment";
export const completion = "quiz-passed";
export const pilot = { ...course, questions: quiz };

export async function publishedCourse(id: string) {
  if (id === pilot.id) return pilot;
  const item = await prisma.academyCourse.findFirst({ where: { id, published: true } });
  if (!item) return null;
  const data = courseInput.parse(item.content);
  return { ...data, id, lessons: data.lessons.map((lesson, index) => ({ ...lesson, id: `lesson-${index + 1}` })) };
}

export async function catalogue() {
  const items = await prisma.academyCourse.findMany({ where: { published: true }, orderBy: { updatedAt: "desc" } });
  return [pilot, ...items.map(item => ({ ...courseInput.parse(item.content), id: item.id }))]
    .map(({ id, title, description, durationMinutes, lessons }) => ({ id, title, description, durationMinutes, lessonCount: lessons.length }));
}
