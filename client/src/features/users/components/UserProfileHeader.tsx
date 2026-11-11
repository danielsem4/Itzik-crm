import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/utils";
import type { User } from "@/features/auth";
import { UserStatusBadge } from "./UserStatusBadge";

interface UserProfileHeaderProps {
  user: User;
  /** Page-level actions (e.g. deactivate), rendered at the inline end. */
  actions?: ReactNode;
}

export function UserProfileHeader({ user, actions }: UserProfileHeaderProps) {
  const { t } = useTranslation("users");
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold leading-tight">{user.name}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="outline">{t(`common:roles.${user.role}`)}</Badge>
              <UserStatusBadge status={user.status} />
            </div>
          </div>
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </CardContent>
    </Card>
  );
}
