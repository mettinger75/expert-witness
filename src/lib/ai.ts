// AI configuration constants
export const AI_CONFIG = {
  models: {
    fast: 'claude-haiku-4-5-20251001',
    standard: 'claude-sonnet-4-20250514',
    advanced: 'claude-opus-4-5-20251101',
  },
  defaultParams: {
    max_tokens: 4096,
    temperature: 0.3,
  },
}

export const MODEL_BY_TASK = {
  document_ocr: 'fast' as const,
  document_classify: 'fast' as const,
  document_summarize: 'standard' as const,
  timeline_extract: 'standard' as const,
  case_analysis: 'advanced' as const,
  report_generation: 'advanced' as const,
  research: 'advanced' as const,
}

// System prompts for different AI tasks
export const SYSTEM_PROMPTS = {
  document_analysis: `You are an expert anesthesiology medical-legal consultant reviewing medical records. Extract key clinical findings, identify anesthesia-related events, note any deviations from standard of care, and flag critical information. Be precise with medical terminology and cite specific page references when available.`,

  timeline_generation: `You are creating a detailed medical chronology for litigation purposes. Extract events in strict chronological order. For each event include: date/time, event description, provider/facility, and source document. Focus on anesthesia-relevant events: intubation, medication administration, vital sign changes, complications, and clinical decisions. Be factually precise.`,

  standard_of_care: `You are an expert anesthesiologist analyzing whether the care provided met the applicable standard of care. Consider: ASA guidelines, accepted clinical practices, institutional protocols, patient-specific factors, and timing of interventions. Identify specific deviations and their clinical significance. Maintain objectivity.`,

  report_generation: `You are drafting an expert witness report for a board-certified anesthesiologist. Use formal medical-legal language. Structure content clearly with headings. Support conclusions with specific evidence from the medical records. Maintain an authoritative yet objective tone. Include appropriate medical citations.`,

  research_assistant: `You are a medical-legal research assistant specializing in anesthesiology. Help find relevant clinical guidelines, published standards, peer-reviewed literature, and case precedents. Provide accurate citations and summarize key findings relevant to the case analysis.`,

  case_summary: `You are summarizing a medical malpractice case involving anesthesiology care. Include: patient demographics, date of incident, clinical setting, procedures performed, alleged negligence, injuries/outcomes, and key issues. Be concise but comprehensive.`,

  deposition_prep: `You are preparing an expert witness for deposition testimony. Identify key topics likely to be addressed, potential challenging questions, important exhibits, and areas requiring careful preparation. Organize by topic with suggested testimony approaches.`,
}

// Context assembly helper
export function assembleContext(
  caseData: Record<string, unknown>,
  documents?: string[],
  timeline?: string[]
): string {
  const parts: string[] = []

  if (caseData) {
    parts.push('## Case Information')
    parts.push(JSON.stringify(caseData, null, 2))
  }

  if (documents?.length) {
    parts.push('## Relevant Documents')
    documents.forEach((doc, i) => {
      parts.push(`### Document ${i + 1}`)
      parts.push(doc)
    })
  }

  if (timeline?.length) {
    parts.push('## Medical Timeline')
    timeline.forEach((entry) => parts.push(entry))
  }

  return parts.join('\n\n')
}
