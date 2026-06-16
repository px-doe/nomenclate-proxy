export interface ConventionExample {
  good: string;
  bad: string;
  why: string;
}

export interface Convention {
  name: string;
  description: string;
  rules: string;
  examples: ConventionExample[];
}
