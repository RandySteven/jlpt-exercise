import level from '../json/n3/data.json'
import { examsFromLevelJson } from './bank'

export const n3Exams = examsFromLevelJson('N3', level)
