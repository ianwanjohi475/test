import {
  LayoutDashboard,
  Send,
  Users,
  MessageSquareText,
  Settings,
  CreditCard,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Requests", href: "/requests", icon: Send },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "Templates", href: "/templates", icon: MessageSquareText },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Billing", href: "/billing", icon: CreditCard },
];
