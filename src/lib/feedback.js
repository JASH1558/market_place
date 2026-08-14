import { supabase } from "./supabaseClient";

export const FEEDBACK_CATEGORIES = [
  { value: "general", label: "General feedback" },
  { value: "bug", label: "Something's broken" },
  { value: "feature_request", label: "Feature idea" },
  { value: "compliment", label: "Just wanted to say thanks" },
  { value: "other", label: "Something else" },
];

export async function submitFeedback({ userId, name, email, category, message }) {
  const trimmed = message.trim();
  if (!trimmed) throw new Error("Write a bit of feedback before sending.");

  const { error } = await supabase.from("feedback").insert({
    user_id: userId || null,
    name: name?.trim() || null,
    email: email?.trim() || null,
    category: category || "general",
    message: trimmed,
  });
  if (error) throw error;
}
