import { doc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore'
import { db } from './firebase'

export interface StoredCalendarEvent {
  title: string
  date: string
  time: string
  priority: 'high' | 'medium' | 'low'
  type: 'assignment' | 'exam'
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
}

function getCalendarDocRef(uid: string) {
  return doc(db, 'users', uid, 'appData', 'calendar')
}

function getClassesDocRef(uid: string) {
  return doc(db, 'users', uid, 'appData', 'classes')
}

function normalizeCalendarEvent(event: Partial<StoredCalendarEvent>): StoredCalendarEvent {
  return {
    title: event.title ?? '',
    date: event.date ?? '',
    time: event.time ?? '',
    priority: event.priority === 'medium' || event.priority === 'low' ? event.priority : 'high',
    type: event.type === 'exam' ? 'exam' : 'assignment',
  }
}

function normalizeClass(course: Partial<StoredClassInfo>, index: number): StoredClassInfo {
  return {
    id: course.id ?? index,
    title: course.title ?? `Class ${index + 1}`,
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
