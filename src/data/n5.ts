import level from '../json/n5/data.json'
import { examsFromLevelJson } from './bank'

export const n5Exams = examsFromLevelJson('N5', level)
