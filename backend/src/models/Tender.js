import mongoose from 'mongoose';

const tenderSchema = new mongoose.Schema(
  {
    tender_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      default: 'Government Procurement Notice',
    },
    issuing_agency: {
      type: String,
      default: 'Public Authority',
    },
    budget_usd: {
      type: Number,
      default: 0,
    },
    submission_deadline: {
      type: String,
      default: 'Open',
    },
    eligibility: {
      type: String,
      default: 'Standard General Conditions',
    },
    source_url: {
      type: String,
      default: '',
    },
    extraction_confidence: {
      type: Number,
      default: 0.85,
    },
    status: {
      type: String,
      enum: ['MONITORED', 'MUTATION_DETECTED', 'ARCHIVED'],
      default: 'MONITORED',
    },
    saved_by: {
      type: String,
      default: 'ishantmohan045@gmail.com',
    },
    history: [
      {
        detected_at: { type: Date, default: Date.now },
        change_summary: String,
        previous_budget: Number,
        updated_budget: Number,
        previous_deadline: String,
        updated_deadline: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Tender = mongoose.model('Tender', tenderSchema);
export default Tender;
