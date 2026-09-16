import mongoose, { Schema, Model } from 'mongoose';
import { ICommentDocument } from '../types';

const CommentSchema = new Schema<ICommentDocument>(
  {
    task: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: [true, 'Task reference is required'],
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Comment author is required'],
    },
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      maxlength: [1000, 'Comment content cannot exceed 1000 characters'],
    },
    mentions: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
);

// ─── Index ────────────────────────────────────────────────────────────────────
CommentSchema.index({ task: 1 });
CommentSchema.index({ task: 1, createdAt: -1 });

export const Comment: Model<ICommentDocument> = mongoose.model<ICommentDocument>(
  'Comment',
  CommentSchema
);
export default Comment;
