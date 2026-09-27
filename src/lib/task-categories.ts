export type TaskCategoryOption = {
  label: string;
  icon: string;
  fallback: string;
};

export const defaultTaskCategories: TaskCategoryOption[] = [
  { label: 'غير مصنف', icon: 'tag', fallback: '—' },
  { label: 'العمل', icon: 'briefcase.fill', fallback: '▣' },
  { label: 'الدراسة', icon: 'book.fill', fallback: '▤' },
  { label: 'شخصي', icon: 'person.fill', fallback: '●' },
];

export function taskCategoryOption(label: string): TaskCategoryOption {
  return defaultTaskCategories.find((item) => item.label === label) ?? {
    label,
    icon: 'folder.fill',
    fallback: '□',
  };
}
