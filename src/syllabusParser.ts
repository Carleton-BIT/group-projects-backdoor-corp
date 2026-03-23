import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { StoredCalendarEvent, StoredClassInfo } from './storage'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

export interface ParsedSyllabusData {
  course: Partial<StoredClassInfo>
  events: StoredCalendarEvent[]
  rawText: string
  source: 'remote-ai' | 'local-fallback'
}

type RemoteParserResponse = Partial<ParsedSyllabusData> & {
  course?: Partial<StoredClassInfo>
  events?: StoredCalendarEvent[]
}

type SyllabusStyle = 'algonquin_outline' | 'carleton_law_outline' | 'carleton_simple_outline' | 'generic'

const weekdayPattern = /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i
const timeRangePattern = /(\d{1,2}:\d{2}\s?(?:AM|PM|am|pm))\s*-\s*(\d{1,2}:\d{2}\s?(?:AM|PM|am|pm))/i
const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const monthNamePattern = '(?:Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|Sept|September|Oct|October|Nov|November|Dec|December)'
const monthDatePattern = new RegExp(`\\b${monthNamePattern}\\s+\\d{1,2}(?:,\\s*\\d{4})?`, 'i')
const globalMonthDatePattern = new RegExp(`\\b${monthNamePattern}\\s+\\d{1,2}(?:,\\s*\\d{4})?`, 'gi')

function normalizeWhitespace(text: string) {
  return text.replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').replace(/\r/g, '')
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function createSegments(text: string) {
  return text
    .split(/\n|\|/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function toTwentyFourHour(time: string) {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return ''

  let hours = Number(match[1])
  const minutes = match[2]
  const period = match[3].toUpperCase()

  if (period === 'AM' && hours === 12) hours = 0
  if (period === 'PM' && hours !== 12) hours += 12

  return `${String(hours).padStart(2, '0')}:${minutes}`
}

function normalizeDate(value: string) {
  const cleaned = value.replace(/,/g, '').trim()
  const withYear = /\b\d{4}\b/.test(cleaned) ? cleaned : `${cleaned} ${new Date().getFullYear()}`
  const parsed = new Date(withYear)
  if (Number.isNaN(parsed.getTime())) return ''

  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`
}

function normalizeDateWithYear(value: string, yearHint?: string) {
  const cleaned = value.replace(/,/g, '').trim()
  const withYear = /\b\d{4}\b/.test(cleaned) ? cleaned : `${cleaned} ${yearHint ?? new Date().getFullYear()}`
  const parsed = new Date(withYear)
  if (Number.isNaN(parsed.getTime())) return ''

  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`
}

function pickCourseCode(text: string) {
  return text.match(/\b[A-Z]{3,5}\s?-?\d{4}[A-Z]?\b/)?.[0]?.replace(/\s+/, ' ') ?? ''
}

function detectStyle(rawText: string) : SyllabusStyle {
  if (/algonquin college|course number:|approved for academic year:/i.test(rawText)) return 'algonquin_outline'
  if (/carleton university|course outline template|department of law and legal studies/i.test(rawText)) return 'carleton_law_outline'
  if (/instructor:\s*\|?|grading scheme:|lecture:\s*\|?|course description:/i.test(rawText) && /carleton\.ca|cunet\.carleton\.ca/i.test(rawText)) {
    return 'carleton_simple_outline'
  }
  return 'generic'
}

function pickAlgonquinCourseTitle(lines: string[]) {
  const isLikelyAlgonquinTitle = (line: string) => {
    if (pickCourseCode(line)) return false
    if (line.length < 8 || line.length > 90) return false
    if (/algonquin college|course number:|prepared by:|approved by|approval date|program|course description|course curriculum|relationship to degree program learning outcomes|applicable program|approved for academic|year:/i.test(line)) {
      return false
    }
    if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3},?$/.test(line)) return false
    return /^[A-Z][A-Za-z&,\- ]+$/.test(line)
  }

  const curriculumIndex = lines.findIndex((line) => /course curriculum/i.test(line))
  if (curriculumIndex > 0) {
    const beforeCurriculum = lines.slice(Math.max(0, curriculumIndex - 12), curriculumIndex).reverse()
    const titleBeforeCurriculum = beforeCurriculum.find((line) => isLikelyAlgonquinTitle(line))
    if (titleBeforeCurriculum) return titleBeforeCurriculum.trim()
  }

  const directTitle = lines.find((line, index) => {
    const previousLine = lines[index - 1] ?? ''
    const nextLine = lines[index + 1] ?? ''
    if (!isLikelyAlgonquinTitle(line)) return false
    if (/^(Professor|Chair|Coordinator|Instructor)$/i.test(nextLine)) return false
    return /prepared by:|relationship to degree program learning outcomes/i.test(previousLine)
  })
  if (directTitle) return directTitle.trim()

  const courseNumberIndex = lines.findIndex((line) => /course number:/i.test(line))
  if (courseNumberIndex >= 0) {
    const nearbyLines = lines.slice(courseNumberIndex + 1, courseNumberIndex + 8)
    const explicitTitle = nearbyLines.find((line, index) => {
      const nextLine = nearbyLines[index + 1] ?? ''
      if (!isLikelyAlgonquinTitle(line)) return false
      if (/^(Professor|Chair|Coordinator|Instructor)$/i.test(nextLine)) return false
      return true
    })
    if (explicitTitle) return explicitTitle.trim()
  }
  return ''
}

function pickCarletonLawTitle(text: string, lines: string[]) {
  const courseInlineMatch = text.match(/\b[A-Z]{3,5}\s?-?\d{4}\s?[A-Z]?\s*[–-]\s*([^|]+?)\s+T\s*\|\s*ERM/i)
  if (courseInlineMatch?.[1]) return courseInlineMatch[1].replace(/\|/g, ' ').trim()

  const courseLine = lines.find((line) => /course\s*:/i.test(line) && /[A-Z]{3,5}\s?-?\d{4}/.test(line))
  if (courseLine) {
    const cleaned = courseLine
      .replace(/.*course\s*:\s*/i, '')
      .replace(/\b[A-Z]{3,5}\s?-?\d{4}\s?[A-Z]?\b\s*[–-]\s*/i, '')
      .trim()
    if (cleaned && !/carleton university/i.test(cleaned)) return cleaned
  }

  return ''
}

function pickCarletonSimpleTitle(text: string) {
  const firstLineTitle = text.match(/\b[A-Z]{3,5}\s?-?\d{4}(?:\s*\([^)]+\))?\s*\|\s*\|\s*([^|]+?)\s*\|\s*\|\s*(?:Fall|Winter|Summer)\s+\d{4}/i)
  if (firstLineTitle?.[1]) return firstLineTitle[1].trim()
  return ''
}

function pickCourseTitle(lines: string[], text: string, style: SyllabusStyle) {
  const titleLine = lines.find((line) => /course title|title:/i.test(line))
  if (titleLine) return titleLine.split(':').slice(1).join(':').trim()

  if (style === 'algonquin_outline') {
    const algonquinTitle = pickAlgonquinCourseTitle(lines)
    if (algonquinTitle) return algonquinTitle
  }

  if (style === 'carleton_law_outline') {
    const carletonTitle = pickCarletonLawTitle(text, lines)
    if (carletonTitle) return carletonTitle
  }

  if (style === 'carleton_simple_outline') {
    const carletonSimpleTitle = pickCarletonSimpleTitle(text)
    if (carletonSimpleTitle) return carletonSimpleTitle
  }

  const combinedCourseLine = lines.find((line, index) => {
    const nextLine = lines[index + 1] ?? ''
    return /course outline/i.test(line) && /[A-Z]{3,5}\s?-?\d{4}/.test(nextLine)
  })
  if (combinedCourseLine) {
    const nextLine = lines[lines.indexOf(combinedCourseLine) + 1] ?? ''
    const cleaned = nextLine
      .replace(/\b[A-Z]{3,5}\s?-?\d{4}\s?[A-Z]?\b\s*[–-]\s*/i, '')
      .trim()
    if (cleaned && !/carleton university/i.test(cleaned)) return cleaned
  }

  const courseLine = lines.find((line) => /course\s*:/i.test(line) && /[A-Z]{3,5}\s?-?\d{4}/.test(line))
  if (courseLine) {
    const cleaned = courseLine
      .replace(/.*course\s*:\s*/i, '')
      .replace(/\b[A-Z]{3,5}\s?-?\d{4}\s?[A-Z]?\b\s*[–-]\s*/i, '')
      .trim()
    if (cleaned && !/carleton university/i.test(cleaned)) return cleaned
  }

  return lines.find((line) => {
    if (line.length < 8 || line.length > 80) return false
    if (pickCourseCode(line)) return false
    if (/algonquin|carleton university|department of|course outline|course curriculum|learning outcomes|course description|approved|program|college/i.test(line)) return false
    return /^[A-Z][A-Za-z&,\- ]+$/.test(line)
  }) ?? ''
}

function pickEmails(text: string) {
  return Array.from(new Set(text.match(emailPattern) ?? []))
}

function pickNamedContact(lines: string[], label: RegExp, fallbackEmail?: string) {
  const line = lines.find((entry) => label.test(entry))
  if (!line) return { name: '', email: fallbackEmail ?? '' }

  const withoutLabel = line.replace(label, '').replace(/[:-]/g, ' ').trim()
  const email = line.match(emailPattern)?.[0] ?? fallbackEmail ?? ''
  const name = withoutLabel.replace(email, '').trim()
  return { name, email }
}

function pickProfessor(text: string, lines: string[], fallbackEmail?: string) {
  const preparedByLine = lines.find((line) => /prepared by:/i.test(line))
  if (preparedByLine) {
    const preparedByName = preparedByLine
      .replace(/.*prepared by:\s*/i, '')
      .replace(/\bProfessor\b.*$/i, '')
      .replace(/,\s*$/g, '')
      .trim()

    if (preparedByName) {
      return {
        name: preparedByName,
        email: fallbackEmail ?? '',
      }
    }
  }

  const preparedBy = text.match(/Prepared by:\s*(?:\|\s*)?([^|\n]+?)(?:,\s*Professor)?(?:\||\n|$)/i)
  if (preparedBy?.[1]?.trim()) {
    return {
      name: preparedBy[1].trim(),
      email: fallbackEmail ?? '',
    }
  }

  const instructorBlock = text.match(/\bI\s*\|\s*NSTRUCTOR\s*\|\s*:\s*\|\s*([^|\n]+(?:\|[^|\n]+){0,8})/i)
  if (instructorBlock?.[1]) {
    const cleaned = instructorBlock[1]
      .replace(/\|/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/,\s*(PhD|MBA|LLM|LLB|BAHon|BA|MA|JD|BCL|MPhil).*$/i, '')
      .trim()
    if (cleaned) {
      return {
        name: cleaned,
        email: fallbackEmail ?? '',
      }
    }
  }

  const instructorLine = lines.find((line) => /\binstructor\b/i.test(line))
  if (instructorLine) {
    const cleaned = instructorLine
      .replace(/.*\binstructor\b\s*:\s*/i, '')
      .replace(/,\s*(PhD|MBA|LLM|LLB|BAHon|BA|MA|JD|BCL|MPhil).*/i, '')
      .trim()
    if (cleaned) {
      return {
        name: cleaned,
        email: fallbackEmail ?? '',
      }
    }
  }

  return pickNamedContact(lines, /\b(?:professor|instructor|lecturer)\b/i, fallbackEmail)
}

function pickAlgonquinProfessor(lines: string[], fallbackEmail?: string) {
  const preparedByIndex = lines.findIndex((line) => /prepared by:/i.test(line))
  if (preparedByIndex >= 0) {
    const nearbyLines = lines.slice(preparedByIndex + 1, preparedByIndex + 5)
    const nameLine = nearbyLines.find((line) => {
      if (!line || /professor|applicable program|approval date|algonquin college/i.test(line)) return false
      return /^[A-Z][A-Za-z .,'-]+$/.test(line)
    })
    if (nameLine) {
      return { name: nameLine.replace(/,\s*$/g, '').trim(), email: fallbackEmail ?? '' }
    }
  }
  return pickProfessor(lines.join(' | '), lines, fallbackEmail)
}

function pickCarletonProfessor(text: string, lines: string[], fallbackEmail?: string) {
  const instructorBlock = text.match(/\bI\s*\|\s*NSTRUCTOR\s*\|\s*:\s*\|\s*([^|\n]+(?:\|[^|\n]+){0,8})/i)
  if (instructorBlock?.[1]) {
    const cleaned = instructorBlock[1]
      .replace(/\|/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/,\s*(PhD|MBA|LLM|LLB|BAHon|BA|MA|JD|BCL|MPhil).*$/i, '')
      .trim()
    if (cleaned) return { name: cleaned, email: fallbackEmail ?? '' }
  }
  return pickProfessor(text, lines, fallbackEmail)
}

function pickCarletonSimpleProfessor(text: string, fallbackEmail?: string) {
  const instructorMatch = text.match(/\bInstructor:\s*\|?\s*([^|]+?)\s*\|\s*(?:Office:|Email|TA:|Phone:)/i)
  if (instructorMatch?.[1]) {
    return {
      name: instructorMatch[1].trim(),
      email: fallbackEmail ?? '',
    }
  }
  return { name: '', email: fallbackEmail ?? '' }
}

function pickSchedule(lines: string[], text: string, style: SyllabusStyle) {
  if (style === 'carleton_simple_outline') {
    const lectureMatch = text.match(/\bLecture:\s*\|?\s*([^|]+?)\s*\|\s*\|\s*Location:\s*\|?\s*([^|]+)/i)
    if (lectureMatch) {
      const lectureText = lectureMatch[1].replace(/\|/g, ' ').replace(/\s+/g, ' ').trim()
      const location = lectureMatch[2].replace(/\|/g, ' ').trim()
      const dayMatch = lectureText.match(/\b(Monday|Mondays|Tuesday|Tuesdays|Wednesday|Wednesdays|Thursday|Thursdays|Friday|Fridays|Saturday|Saturdays|Sunday|Sundays)\b/i)
      const timeMatch = lectureText.match(/(\d{1,2}:\d{2}\s?(?:AM|PM|am|pm))\s*(?:to|[-–])\s*(\d{1,2}:\d{2}\s?(?:AM|PM|am|pm))/i)
      if (dayMatch && timeMatch) {
        return {
          day: capitalize(dayMatch[1].replace(/s$/i, '')),
          startTime: toTwentyFourHour(timeMatch[1]),
          endTime: toTwentyFourHour(timeMatch[2]),
          location,
        }
      }
    }
  }

  const textSchedule = text.match(/\b(Monday|Mondays|Tuesday|Tuesdays|Wednesday|Wednesdays|Thursday|Thursdays|Friday|Fridays|Saturday|Saturdays|Sunday|Sundays)\b[^|]*?(\d{1,2}:\d{2}\s?(?:AM|PM|am|pm))\s*[–-]\s*(\d{1,2}:\d{2}\s?(?:AM|PM|am|pm))/i)
  if (textSchedule) {
    const day = textSchedule[1].replace(/s$/i, '')
    const locationMatch = text.match(/\bRoom:\s*([^|]+?)\s*(?:Class is|Instructor|Contact|$)/i)
    const inPerson = /\bClass is in person\b/i.test(text)

    return {
      day: capitalize(day),
      startTime: toTwentyFourHour(textSchedule[2]),
      endTime: toTwentyFourHour(textSchedule[3]),
      location: locationMatch?.[1]?.trim() || (inPerson ? 'In person' : ''),
    }
  }

  for (const line of lines) {
    const dayMatch = line.match(weekdayPattern)
    const timeMatch = line.match(timeRangePattern)
    if (!dayMatch || !timeMatch) continue

    return {
      day: capitalize(dayMatch[1]),
      startTime: toTwentyFourHour(timeMatch[1]),
      endTime: toTwentyFourHour(timeMatch[2]),
      location: line.match(/\b(?:Room|Location|Lab|Online)\b[:\s-]*(.+)$/i)?.[1]?.trim() ?? '',
    }
  }

  return { day: '', startTime: '', endTime: '', location: '' }
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

function normalizeEventType(value: unknown): StoredCalendarEvent['type'] {
  return value === 'exam' ? 'exam' : 'assignment'
}

function normalizePriority(value: unknown, fallbackTitle = ''): StoredCalendarEvent['priority'] {
  if (value === 'high' || value === 'medium' || value === 'low') return value
  return inferPriority(fallbackTitle)
}

function inferPriority(title: string) {
  if (/midterm|final|exam/i.test(title)) return 'high' as const
  if (/project|presentation/i.test(title)) return 'medium' as const
  return 'low' as const
}

function getLastKeywordIndex(text: string, pattern: RegExp) {
  const regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`)
  let lastIndex = -1
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    lastIndex = match.index
  }
  return lastIndex
}

function chooseEventType(context: string, dateText: string) {
  const dateIndex = context.indexOf(dateText)
  const relevantPrefix = dateIndex >= 0 ? context.slice(0, dateIndex) : context
  const examIndex = getLastKeywordIndex(relevantPrefix, /\b(midterm|final|exam|test)\b/i)
  const assignmentIndex = getLastKeywordIndex(relevantPrefix, /\b(in class labs?|labs?|lab|assign(?:ment)?|tutorial|project|quiz|homework|presentation)\b/i)

  if (examIndex === -1 && assignmentIndex === -1) return null
  if (examIndex === -1) return 'assignment' as const
  if (assignmentIndex === -1) return 'exam' as const
  return examIndex > assignmentIndex ? 'exam' as const : 'assignment' as const
}

function isInstitutionalDateContext(context: string) {
  return /\b(sessional dates|calendar website|winter break|university closed|term begins|term ends|official april final examination period|final examinations in fall term courses|formal examination accommodations|last day for|registrar|academic withdrawal)\b/i.test(context)
}

function extractAssessmentEvents(rawText: string, courseCode: string) {
  const events: StoredCalendarEvent[] = []
  const assessmentBlockMatch = rawText.match(/Assessment\s+Due Date\s+Value\s+CLOs([\s\S]*?)(?:\bCourse\b|\bPolicies\b|\bCourse curriculum\b|$)/i)
  const assessmentBlock = assessmentBlockMatch?.[1] ?? rawText

  const addEvent = (title: string, date: string, type: 'assignment' | 'exam') => {
    if (!title || !date) return
    events.push({
      title,
      courseCode,
      date,
      time: '',
      priority: inferPriority(title),
      type,
    })
  }

  const labLineMatch = assessmentBlock.match(/In class labs?\s+((?:Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|Sept|September|Oct|October|Nov|November|Dec|December)[^A-Za-z]*(?:\d{1,2}[^A-Za-z]*)+)/i)
  if (labLineMatch) {
    const yearHint = assessmentBlock.match(/\b20\d{2}\b/)?.[0]
    const tokens = labLineMatch[1]
      .replace(/\s+-.*$/, '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)

    let activeMonth = ''
    for (const token of tokens) {
      const monthMatch = token.match(new RegExp(`^${monthNamePattern}`, 'i'))
      if (monthMatch) activeMonth = monthMatch[0]
      const dayMatch = token.match(/\d{1,2}/)
      if (!activeMonth || !dayMatch) continue
      addEvent('In Class Labs', normalizeDateWithYear(`${activeMonth} ${dayMatch[0]}`, yearHint), 'assignment')
    }
  }

  const focusedPatterns: Array<{ regex: RegExp; title: string; type: 'assignment' | 'exam' }> = [
    { regex: /Midterm exam\s+((?:Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|Sept|September|Oct|October|Nov|November|Dec|December)\s+\d{1,2},?\s*\d{4})/i, title: 'Midterm Exam', type: 'exam' },
    { regex: /(?:Tutorial assignment|Assignment\s*\(?tutorial\)?)(?:\s+due)?(?:\s*[–-]\s*\d+%)?\s+((?:Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|Sept|September|Oct|October|Nov|November|Dec|December)\s+\d{1,2},?\s*\d{4})/i, title: 'Tutorial Assignment', type: 'assignment' },
    { regex: /Final exam\s+((?:Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|Sept|September|Oct|October|Nov|November|Dec|December)\s+\d{1,2})(?:-\d{1,2})?\s*,?\s*(\d{4})/i, title: 'Final Exam', type: 'exam' },
  ]

  for (const pattern of focusedPatterns) {
    const match = assessmentBlock.match(pattern.regex)
    if (!match) continue
    const date = normalizeDateWithYear(match[1], match[2])
    addEvent(pattern.title, date, pattern.type)
  }

  return events
}

function extractEvaluationEvents(rawText: string, courseCode: string) {
  const events: StoredCalendarEvent[] = []
  const evaluationMatch = rawText.match(/EVALUATION([\s\S]*?)(?:LATE PENALTIES|SCHEDULE|UNIVERSITY AND DEPARTMENTAL POLICIES|$)/i)
  const evaluationBlock = evaluationMatch?.[1] ?? ''
  if (!evaluationBlock) return events

  const addEvent = (title: string, date: string) => {
    if (!title || !date) return
    events.push({
      title,
      courseCode,
      date,
      time: '',
      priority: inferPriority(title),
      type: /exam/i.test(title) ? 'exam' : 'assignment',
    })
  }

  const tokens = evaluationBlock
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)

  for (let i = 0; i < tokens.length; i += 1) {
    if (!/^\d+%$/.test(tokens[i])) continue

    const titleParts: string[] = []
    let dueDate = ''

    for (let j = i + 1; j < tokens.length; j += 1) {
      const token = tokens[j]
      if (/^\d+%$/.test(token)) break
      if (/^Due\s+/i.test(token)) {
        dueDate = normalizeDate(token.replace(/^Due\s+/i, ''))
        break
      }
      if (/^(Detailed instructions|[0-9]+\s+pages|Standing in a course|All components|Faculty Dean\.)/i.test(token)) break
      titleParts.push(token)
    }

    const normalizedTitle = titleParts
      .filter((token) => token !== '–' && token !== '-')
      .join(' - ')
      .replace(/\s+-\s+-\s+/g, ' - ')
      .replace(/\s+/g, ' ')
      .trim()

    if (dueDate) {
      addEvent(normalizedTitle, dueDate)
    }
  }

  return events
}

function extractCarletonSimpleEvents(rawText: string, courseCode: string) {
  const events: StoredCalendarEvent[] = []
  const addEvent = (title: string, date: string, type: 'assignment' | 'exam') => {
    if (!title || !date) return
    events.push({
      title,
      courseCode,
      date,
      time: '',
      priority: inferPriority(title),
      type,
    })
  }

  const duePatterns: Array<{ regex: RegExp; type: 'assignment' | 'exam' }> = [
    { regex: /(Participation(?:[^|]+)?|Quizzes(?:[^|]+)?|Research Project - part \d(?:[^|]+)?|Research Project(?:[^|]+)?|Final Exam)\s*\|\s*(?:\d+)\s*\|\s*(?:[^|]+\|\s*){0,3}?Due\s+((?:Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|Sept|September|Oct|October|Nov|November|Dec|December)\s+\d{1,2},?\s*\d{4})/gi, type: 'assignment' },
  ]

  for (const pattern of duePatterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.regex.exec(rawText)) !== null) {
      const rawTitle = match[1].replace(/\|/g, ' ').replace(/\s+/g, ' ').trim()
      const type = /final exam/i.test(rawTitle) ? 'exam' : pattern.type
      addEvent(rawTitle, normalizeDate(match[2]), type)
    }
  }

  return events
}

function extractEventTitle(context: string, type: 'assignment' | 'exam') {
  const compact = context.replace(/\|/g, ' ').replace(/\s+/g, ' ').trim()

  if (type === 'exam') {
    const examMatch = compact.match(/\b(midterm exam|final exam|exam|test)\b/i)
    return examMatch?.[1]?.replace(/\b\w/g, (char) => char.toUpperCase()) ?? 'Exam'
  }

  const assignmentPatterns = [
    /\b(tutorial assignment(?:\s+due)?)\b/i,
    /\b(tutorial assignment)\b/i,
    /\b(lab\s*\d+[^.,;]*)\b/i,
    /\b(assignment)\b/i,
    /\b(project)\b/i,
    /\b(quiz)\b/i,
    /\b(homework)\b/i,
    /\b(presentation)\b/i,
  ]

  for (const pattern of assignmentPatterns) {
    const match = compact.match(pattern)
    if (match?.[1]) {
      return match[1]
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase())
    }
  }

  return 'Assignment'
}

function extractEvents(lines: string[], rawText: string) {
  const events: StoredCalendarEvent[] = []
  const courseCode = pickCourseCode(rawText)

  const addEvent = (title: string, date: string, time: string, type: 'assignment' | 'exam') => {
    if (!title || !date) return
    events.push({
      title,
      courseCode,
      date,
      time,
      priority: inferPriority(title),
      type,
    })
  }

  for (const event of extractAssessmentEvents(rawText, courseCode)) {
    addEvent(event.title, event.date, event.time, event.type)
  }

  for (const event of extractEvaluationEvents(rawText, courseCode)) {
    addEvent(event.title, event.date, event.time, event.type)
  }

  const segments = lines

  for (let i = 0; i < segments.length; i += 1) {
    const line = segments[i]
    const nextContext = segments.slice(i + 1, i + 3).join(' ')
    const prevContext = segments.slice(Math.max(0, i - 1), i).join(' ')
    const context = `${prevContext} ${line} ${nextContext}`.trim()
    const dateMatches = Array.from(line.matchAll(globalMonthDatePattern))
    if (dateMatches.length === 0) continue

    for (const dateMatch of dateMatches) {
      const dateText = dateMatch[0]
      const normalizedDate = normalizeDate(dateText)
      if (!normalizedDate) continue
      if (isInstitutionalDateContext(context)) continue

      const chosenType = chooseEventType(context, dateText)
      if (!chosenType) continue

      const timeMatch = context.match(/(\d{1,2}:\d{2}\s?(?:AM|PM|am|pm))/)
      const normalizedTime = timeMatch ? toTwentyFourHour(timeMatch[1]) : ''
      const title = extractEventTitle(context, chosenType)
      addEvent(title, normalizedDate, normalizedTime, chosenType)
    }
  }

  const breakdownPatterns: Array<{ regex: RegExp; type: 'assignment' | 'exam'; fallbackTitle: string }> = [
    { regex: /Assignment\s*\|?\s*(Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|Sept|September|Oct|October|Nov|November|Dec|December)\s+\d{1,2},?\s*\d{4}/gi, type: 'assignment', fallbackTitle: 'Assignment' },
    { regex: /Midterm exam\s*\|?\s*(Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|Sept|September|Oct|October|Nov|November|Dec|December)\s+\d{1,2},?\s*\d{4}/gi, type: 'exam', fallbackTitle: 'Midterm exam' },
    { regex: /Final exam\s*\|?\s*(Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|Sept|September|Oct|October|Nov|November|Dec|December)\s+\d{1,2}(?:-\d{1,2})?,?\s*\d{4}/gi, type: 'exam', fallbackTitle: 'Final exam' },
  ]

  for (const pattern of breakdownPatterns) {
    const matches = rawText.match(pattern.regex) ?? []
    for (const match of matches) {
      const dateText = match.match(monthDatePattern)?.[0] ?? ''
      const normalizedDate = normalizeDate(dateText)
      const title = extractEventTitle(match.replace(dateText, '').replace(/\|/g, ' ').trim(), pattern.type) || pattern.fallbackTitle
      addEvent(title, normalizedDate, '', pattern.type)
    }
  }

  return events.filter((event, index, all) => {
    return all.findIndex((candidate) => candidate.title === event.title && candidate.date === event.date && candidate.time === event.time && candidate.type === event.type) === index
  })
}

async function extractPdfText(file: File) {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const textParts: string[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' | ')
    textParts.push(pageText)
  }

  return normalizeWhitespace(textParts.join('\n'))
}

function parseSyllabusTextHeuristically(rawText: string): ParsedSyllabusData {
  const lines = createSegments(rawText)
  const style = detectStyle(rawText)

  const emails = pickEmails(rawText)
  const professor = style === 'algonquin_outline'
    ? pickAlgonquinProfessor(lines, emails[0])
    : style === 'carleton_law_outline'
      ? pickCarletonProfessor(rawText, lines, emails[0])
      : style === 'carleton_simple_outline'
        ? pickCarletonSimpleProfessor(rawText, emails[0])
        : pickProfessor(rawText, lines, emails[0])
  const ta = pickNamedContact(lines, /\b(?:teaching assistant|ta)\b/i, emails[1])
  const schedule = pickSchedule(lines, rawText, style)
  const code = pickCourseCode(rawText)
  const title = pickCourseTitle(lines, rawText, style)
  const styleEvents = style === 'carleton_simple_outline' ? extractCarletonSimpleEvents(rawText, code) : []
  const genericEvents = extractEvents(lines, rawText)
  const mergedEvents = [...styleEvents, ...genericEvents].filter((event, index, all) => {
    return all.findIndex((candidate) =>
      candidate.title === event.title &&
      candidate.courseCode === event.courseCode &&
      candidate.date === event.date &&
      candidate.time === event.time &&
      candidate.type === event.type,
    ) === index
  })

  return {
    course: {
      title: title || code || '',
      code,
      day: schedule.day,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      time: [schedule.startTime, schedule.endTime].filter(Boolean).join(' - '),
      location: schedule.location,
      profName: professor.name,
      profEmail: professor.email,
      taName: ta.name,
      taEmail: ta.email,
    },
    events: mergedEvents,
    rawText,
    source: 'local-fallback',
  }
}

function normalizeRemoteParserResponse(payload: RemoteParserResponse, rawText: string): ParsedSyllabusData {
  const fallback = parseSyllabusTextHeuristically(rawText)
  const course = payload?.course ?? {}
  const remoteEvents = Array.isArray(payload?.events) ? payload.events : []

  const normalizedEvents: StoredCalendarEvent[] = remoteEvents
    .map((event): StoredCalendarEvent | null => {
      const title = cleanText(event?.title)
      const date = cleanText(event?.date)
      if (!title || !date) return null

      return {
        title,
        courseCode: cleanText(event?.courseCode) || cleanText(course.code) || cleanText(fallback.course.code),
        date,
        time: cleanText(event?.time),
        priority: normalizePriority(event?.priority, title),
        type: normalizeEventType(event?.type),
      }
    })
    .filter((event): event is StoredCalendarEvent => event !== null)

  const mergedEvents = normalizedEvents.length > 0 ? normalizedEvents : fallback.events
  const startTime = cleanText(course.startTime) || cleanText(fallback.course.startTime)
  const endTime = cleanText(course.endTime) || cleanText(fallback.course.endTime)

  return {
    course: {
      title: cleanText(course.title) || cleanText(course.code) || cleanText(fallback.course.title) || cleanText(fallback.course.code),
      code: cleanText(course.code) || cleanText(fallback.course.code),
      day: cleanText(course.day) || cleanText(fallback.course.day),
      startTime,
      endTime,
      time: [startTime, endTime].filter(Boolean).join(' - '),
      location: cleanText(course.location) || cleanText(fallback.course.location),
      profName: cleanText(course.profName) || cleanText(fallback.course.profName),
      profEmail: cleanText(course.profEmail) || cleanText(fallback.course.profEmail),
      taName: cleanText(course.taName) || cleanText(fallback.course.taName),
      taEmail: cleanText(course.taEmail) || cleanText(fallback.course.taEmail),
    },
    events: mergedEvents,
    rawText,
    source: 'remote-ai',
  }
}

async function parseSyllabusRemotely(rawText: string) {
  const endpoint = import.meta.env.VITE_SYLLABUS_API_URL?.trim()
  if (!endpoint) return null

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rawText }),
  })

  if (!response.ok) {
    throw new Error(`Remote syllabus parser failed with status ${response.status}`)
  }

  const payload = await response.json() as RemoteParserResponse
  return normalizeRemoteParserResponse(payload, rawText)
}

export async function parseSyllabusPdf(file: File): Promise<ParsedSyllabusData> {
  const rawText = await extractPdfText(file)

  try {
    const remoteParsed = await parseSyllabusRemotely(rawText)
    if (remoteParsed) return remoteParsed
  } catch (error) {
    console.warn('Remote syllabus parser unavailable, falling back to local parser.', error)
  }

  return parseSyllabusTextHeuristically(rawText)
}
