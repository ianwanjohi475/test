import {
  LayoutDashboard,
  Send,
  Users,
  MessageSquareText,
  Settings,
  CreditCard,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

export type NavGroup = {
  heading: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    heading: "Menu",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Requests", href: "/requests", icon: Send },
      { label: "Customers", href: "/customers", icon: Users },
      { label: "Templates", href: "/templates", icon: MessageSquareText },
    ],
  },
  {
    heading: "General",
    items: [
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "Billing", href: "/billing", icon: CreditCard },
      { label: "Help", href: "/help", icon: LifeBuoy },
    ],
  },
];
