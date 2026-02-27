export type BlogPost = {
  id: string;
  title: string;
  content: string;
  rawTranscript: string | null;
  createdAt: string;
  audioUrl: string | null;
  authorId: string;
  authorName: string;
  authorUsername: string;
  visibility: "public" | "private";
};
