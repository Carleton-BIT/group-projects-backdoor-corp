import { doc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore'
import { db } from './firebase'
import { normalizeDeadlineType, type DeadlineType } from './deadlines'

export interface StoredCalendarEvent {
  title: string
  courseCode?: string
  date: string
  time: string
  priority: 'high' | 'medium' | 'low'
  type: 'assignment' | 'exam'
  deadlineType?: DeadlineType
  sourceUploadId?: string
}

export interface StoredClassInfo {
  id: number
  title: string
  code: string
  day: string
  startTime: string
  endTime: string
  time: string
  location: string
  profName: string
  profEmail: string
  taName: string
  taEmail: string
  sourceUploadId?: string
}

export interface StoredSyllabusUpload {
  id: string
  name: string
  url: string
  storagePath: string
  status: 'processing' | 'review' | 'done' | 'error'
  message: string
  parsedCourse?: {
    title: string
    code: string
    day: string
    startTime: string
    endTime: string
    location: string
    profName: string
    profEmail: string
    taName: string
    taEmail: string
  }
  parsedEvents?: Array<{
    title: string
    courseCode?: string
    date: string
    time: string
    type: 'assignment' | 'exam'
    deadlineType?: DeadlineType
    priority: 'high' | 'medium' | 'low'
  }>
}

function getCalendarDocRef(uid: string) {
  return doc(db, 'users', uid, 'appData', 'calendar')
}

function getClassesDocRef(uid: string) {
  return doc(db, 'users', uid, 'appData', 'classes')
}

function getSyllabusDocRef(uid: string) {
  return doc(db, 'users', uid, 'appData', 'syllabi')
}

function normalizeCalendarEvent(event: Partial<StoredCalendarEvent>): StoredCalendarEvent {
  return {
    title: event.title ?? '',
    courseCode: event.courseCode ?? '',
    date: event.date ?? '',
    time: event.time ?? '',
    priority: event.priority === 'medium' || event.priority === 'low' ? event.priority : 'high',
    type: event.type === 'exam' ? 'exam' : 'assignment',
    deadlineType: normalizeDeadlineType(event.deadlineType, event.type === 'exam' ? 'exam' : 'assignment'),
    sourceUploadId: event.sourceUploadId ?? '',
  }
}

function normalizeClass(course: Partial<StoredClassInfo>, index: number): StoredClassInfo {
  return {
    id: course.id ?? index,
    title: course.title ?? '',
    code: course.code ?? '',
    day: course.day ?? '',
    startTime: course.startTime ?? '',
    endTime: course.endTime ?? '',
    time: course.time ?? '',
    location: course.location ?? '',
    profName: course.profName ?? '',
    profEmail: course.profEmail ?? '',
    taName: course.taName ?? '',
    taEmail: course.taEmail ?? '',
    sourceUploadId: course.sourceUploadId ?? '',
  }
}

function normalizeUpload(upload: Partial<StoredSyllabusUpload>): StoredSyllabusUpload {
  return {
    id: upload.id ?? '',
    name: upload.name ?? 'Untitled syllabus',
    url: upload.url ?? '',
    storagePath: upload.storagePath ?? '',
    status: upload.status === 'processing' || upload.status === 'review' || upload.status === 'error' ? upload.status : 'done',
    message: upload.message ?? '',
    parsedCourse: upload.parsedCourse
      ? {
          title: upload.parsedCourse.title ?? '',
          code: upload.parsedCourse.code ?? '',
          day: upload.parsedCourse.day ?? '',
          startTime: upload.parsedCourse.startTime ?? '',
          endTime: upload.parsedCourse.endTime ?? '',
          location: upload.parsedCourse.location ?? '',
          profName: upload.parsedCourse.profName ?? '',
          profEmail: upload.parsedCourse.profEmail ?? '',
          taName: upload.parsedCourse.taName ?? '',
          taEmail: upload.parsedCourse.taEmail ?? '',
        }
      : undefined,
    parsedEvents: Array.isArray(upload.parsedEvents)
      ? upload.parsedEvents.map((event) => ({
          title: event.title ?? '',
          courseCode: event.courseCode ?? '',
          date: event.date ?? '',
          time: event.time ?? '',
          type: event.type === 'exam' ? 'exam' : 'assignment',
          deadlineType: normalizeDeadlineType(event.deadlineType, event.type === 'exam' ? 'exam' : 'assignment'),
          priority: event.priority === 'medium' || event.priority === 'low' ? event.priority : 'high',
        }))
      : [],
  }
}

export function getDefaultClasses(): StoredClassInfo[] {
  return Array.from({ length: 6 }, (_, i) => normalizeClass({}, i))
}

export function subscribeToCalendarEvents(
  uid: string,
  onChange: (events: StoredCalendarEvent[]) => void,
) : Unsubscribe {
  return onSnapshot(getCalendarDocRef(uid), (snapshot) => {
    const data = snapshot.data()
    const events = Array.isArray(data?.events)
      ? data.events.map((event: Partial<StoredCalendarEvent>) => normalizeCalendarEvent(event))
      : []

    onChange(events)
  })
}

export async function saveCalendarEvents(uid: string, events: StoredCalendarEvent[]) {
  await setDoc(
    getCalendarDocRef(uid),
    { events: events.map((event) => normalizeCalendarEvent(event)) },
    { merge: true },
  )
}

export function subscribeToClasses(
  uid: string,
  onChange: (classes: StoredClassInfo[]) => void,
) : Unsubscribe {
  return onSnapshot(getClassesDocRef(uid), (snapshot) => {
    const data = snapshot.data()
    const classes = Array.isArray(data?.classes)
      ? data.classes.map((course: Partial<StoredClassInfo>, index: number) => normalizeClass(course, index))
      : getDefaultClasses()

    onChange(classes)
  })
}

export async function saveClasses(uid: string, classes: StoredClassInfo[]) {
  await setDoc(
    getClassesDocRef(uid),
    { classes: classes.map((course, index) => normalizeClass(course, index)) },
    { merge: true },
  )
}

export function subscribeToSyllabusUploads(
  uid: string,
  onChange: (uploads: StoredSyllabusUpload[]) => void,
): Unsubscribe {
  return onSnapshot(getSyllabusDocRef(uid), (snapshot) => {
    const data = snapshot.data()
    const uploads = Array.isArray(data?.uploads)
      ? data.uploads.map((upload: Partial<StoredSyllabusUpload>) => normalizeUpload(upload))
      : []

    onChange(uploads)
  })
}

export async function saveSyllabusUploads(uid: string, uploads: StoredSyllabusUpload[]) {
  await setDoc(
    getSyllabusDocRef(uid),
    { uploads: uploads.map((upload) => normalizeUpload(upload)) },
    { merge: true },
  )
}
