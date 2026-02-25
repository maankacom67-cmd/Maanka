export interface Job {
  id: string;
  title: string;
  location: string;
  company: string;
  type: 'Full-time' | 'Part-time' | 'Contract';
  salary?: string;
  postedAt: string;
}

export interface User {
  email: string;
  name: string;
}
