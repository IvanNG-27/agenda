import type { State, Subject } from './types';

export const PALETTE: { token: string; name: string }[] = [
  { token: 'subj-azul', name: 'Azul' },
  { token: 'subj-turquesa', name: 'Turquesa' },
  { token: 'subj-violeta', name: 'Violeta' },
  { token: 'subj-rosa', name: 'Rosa' },
  { token: 'subj-ambar', name: 'Ámbar' },
  { token: 'subj-lavanda', name: 'Lavanda' },
  { token: 'subj-arena', name: 'Arena' },
  { token: 'subj-verde', name: 'Verde' },
  { token: 'subj-amarillo', name: 'Amarillo' },
];

export const DEFAULT_SUBJECTS: Subject[] = [
  { id: 'ad', name: 'Acceso a Datos', short: 'AD', color: 'subj-azul' },
  { id: 'pmdm', name: 'PMDM', short: 'PMDM', color: 'subj-turquesa' },
  { id: 'psp', name: 'PSP', short: 'PSP', color: 'subj-violeta' },
  { id: 'di', name: 'Desarrollo de Interfaces', short: 'DI', color: 'subj-rosa' },
  { id: 'sge', name: 'Sistemas de Gestión Empresarial', short: 'SGE', color: 'subj-ambar' },
  { id: 'proyecto', name: 'Proyecto Intermodular', short: 'Proyecto', color: 'subj-lavanda' },
  { id: 'web', name: 'Desarrollo Web', short: 'Web', color: 'subj-arena' },
  { id: 'syd', name: 'Sostenibilidad y Digitalización', short: 'SyD', color: 'subj-verde' },
];

export const initialState = (): State => ({
  version: 1,
  userName: 'Iván',
  subjects: DEFAULT_SUBJECTS.map((s) => ({ ...s })),
  tasks: [],
  exams: [],
});
