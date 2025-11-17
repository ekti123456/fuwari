export interface Sponsor {
  name: string;
  avatar: string | null;
  date: string;
  amount: string;
}

export interface Friend {
  name: string;
  avatar: string;
  description: string;
  url: string;
}

export interface SponsorsData {
  sponsors: Sponsor[];
}

export interface FriendsData {
  friends: Friend[];
}

export interface Tool {
  name: string;
  icon: string;
  description: string;
  url?: string;
  category: string;
  slug?: string;
  statsPath?: string;
}

export interface ToolsData {
  tools: Tool[];
}