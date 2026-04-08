export type NavItem = {
  path: string;
  label: string;
  icon: string;
};

export type TestStep = {
  id: string;
  description: string;
  locator: string;
  locatorType: string;
  status: "pending" | "mapped" | "review";
};

export type TestCase = {
  id: string;
  title: string;
  status: string;
  steps: TestStep[];
};

export type LocatorOption = {
  label: string;
  value: string;
};

export type CodeFile = {
  name: string;
  language: string;
  content: string;
};
