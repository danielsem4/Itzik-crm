import { useTranslation } from "react-i18next";
import { Eye, UserX } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { IconActionButton, TableEmptyRow } from "@/components/shared";
import { initials } from "@/lib/utils";
import type { User } from "@/features/auth";
import { UserStatusBadge } from "./UserStatusBadge";

const COLUMN_COUNT = 6;

interface UsersTableProps {
  users: User[];
  onView: (user: User) => void;
  onDeactivate: (user: User) => void;
}

export function UsersTable({ users, onView, onDeactivate }: UsersTableProps) {
  const { t } = useTranslation("users");

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("table.name")}</TableHead>
          <TableHead>{t("table.email")}</TableHead>
          <TableHead>{t("table.role")}</TableHead>
          <TableHead>{t("table.status")}</TableHead>
          <TableHead>{t("table.created")}</TableHead>
          <TableHead className="text-end">{t("table.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.length === 0 ? (
          <TableEmptyRow colSpan={COLUMN_COUNT}>{t("table.noData")}</TableEmptyRow>
        ) : (
          users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {initials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{user.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{user.email}</TableCell>
              <TableCell>
                <Badge variant="outline">{t(`common:roles.${user.role}`)}</Badge>
              </TableCell>
              <TableCell>
                <UserStatusBadge status={user.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(user.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <IconActionButton
                    icon={Eye}
                    label={t("table.view")}
                    onClick={() => onView(user)}
                  />
                  <IconActionButton
                    icon={UserX}
                    label={t("deactivate.title")}
                    tone="destructive"
                    disabled={user.status === "DISABLED"}
                    onClick={() => onDeactivate(user)}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
