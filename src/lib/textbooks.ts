export type Textbook = {
  id: string;
  title: string;
  author: string;
  price: number;
  condition: 'Idealny' | 'Jak nowy' | 'Dobry' | 'Używany';
  cover: string;
  course: string;
};

export const textbooks: Textbook[] = [
  {
    id: 'tb-01',
    title: 'Introduction to Algorithms',
    author: 'Cormen, Leiserson, Rivest',
    price: 42,
    condition: 'Jak nowy',
    cover:
      'https://images.unsplash.com/photo-1532012197267-da84d127e7c5?auto=format&fit=crop&w=600&q=80',
    course: 'CS 301',
  },
  {
    id: 'tb-02',
    title: 'Structure and Interpretation of Computer Programs',
    author: 'Abelson & Sussman',
    price: 28,
    condition: 'Dobry',
    cover:
      'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=600&q=80',
    course: 'CS 201',
  },
  {
    id: 'tb-03',
    title: 'Linear Algebra Done Right',
    author: 'Sheldon Axler',
    price: 24,
    condition: 'Idealny',
    cover:
      'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80',
    course: 'MATH 224',
  },
  {
    id: 'tb-04',
    title: 'The Pragmatic Programmer',
    author: 'Hunt & Thomas',
    price: 19,
    condition: 'Jak nowy',
    cover:
      'https://images.unsplash.com/photo-1589998059171-9ebd5acf64e0?auto=format&fit=crop&w=600&q=80',
    course: 'SE 110',
  },
  {
    id: 'tb-05',
    title: 'Computer Organization and Design',
    author: 'Patterson & Hennessy',
    price: 36,
    condition: 'Dobry',
    cover:
      'https://images.unsplash.com/photo-1488229297573-8b4c2a40492b?auto=format&fit=crop&w=600&q=80',
    course: 'CS 250',
  },
  {
    id: 'tb-06',
    title: 'Designing Data-Intensive Applications',
    author: 'Martin Kleppmann',
    price: 32,
    condition: 'Jak nowy',
    cover:
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
    course: 'DS 420',
  },
  {
    id: 'tb-07',
    title: 'Artificial Intelligence: A Modern Approach',
    author: 'Russell & Norvig',
    price: 45,
    condition: 'Używany',
    cover:
      'https://images.unsplash.com/photo-1535398089889-dd48d1623b8a?auto=format&fit=crop&w=600&q=80',
    course: 'CS 470',
  },
  {
    id: 'tb-08',
    title: 'Operating System Concepts',
    author: 'Silberschatz, Galvin, Gagne',
    price: 30,
    condition: 'Dobry',
    cover:
      'https://images.unsplash.com/photo-1494256997604-768d1f608cac?auto=format&fit=crop&w=600&q=80',
    course: 'CS 330',
  },
];
