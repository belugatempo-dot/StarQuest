"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/lib/auth";
import AddChildModal from "./AddChildModal";
import EditChildModal from "./EditChildModal";
import EditParentModal from "./EditParentModal";
import ResetPasswordModal from "./ResetPasswordModal";

interface FamilyMemberListProps {
  parents: User[];
  children: User[];
  currentUser: User;
  locale: string;
}

export default function FamilyMemberList({
  parents,
  children,
  currentUser,
  locale,
}: FamilyMemberListProps) {
  const t = useTranslations();
  const router = useRouter();
  const supabase = createClient();

  const [showAddChildModal, setShowAddChildModal] = useState(false);
  const [editingChild, setEditingChild] = useState<User | null>(null);
  const [editingParent, setEditingParent] = useState<User | null>(null);
  const [resettingPasswordChild, setResettingPasswordChild] = useState<User | null>(null);
  const [deletingChild, setDeletingChild] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDeleteChild = async (child: User) => {
    if (!confirm(t("family.confirmDelete", { name: child.name }))) {
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      // Delete from auth.users (cascade will delete from users table)
      const { data: { user: authUser } } = await supabase.auth.admin.deleteUser(child.id);

      // Note: Supabase admin API is not available in client
      // We need to use a database function or server action
      // For now, let's use a workaround with soft delete or server function

      // Alternative: Call a server API route
      const response = await fetch(`/${locale}/api/admin/delete-child`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: child.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete child");
      }

      router.refresh();
      setDeletingChild(null);
    } catch (err: any) {
      console.error("Error deleting child:", err);
      setError(t("family.deleteError"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Parents Section */}
      <section>
        <h2 className="text-xl font-semibold text-slate-200 mb-4 flex items-center">
          <span className="mr-2">👨‍👩</span>
          {t("family.parents")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {parents.map((parent) => (
            <div
              key={parent.id}
              className="dark-card border-2 border-indigo-500/30 rounded-lg p-6 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-indigo-500/15 rounded-full flex items-center justify-center text-2xl">
                    👨‍💼
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{parent.name}</h3>
                    <p className="text-sm text-slate-400">{parent.email}</p>
                    {parent.id === currentUser.id && (
                      <span className="inline-block mt-1 text-xs bg-indigo-500/15 text-indigo-300 px-2 py-1 rounded">
                        {t("family.you")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {/* Actions - only show for current user */}
              {parent.id === currentUser.id && (
                <div className="flex flex-col space-y-2 mt-4 pt-4 border-t border-white/10">
                  <button
                    onClick={() => setEditingParent(parent)}
                    className="text-sm text-blue-300 hover:text-blue-200 text-left flex items-center space-x-2"
                  >
                    <span>✏️</span>
                    <span>{t("family.editInfo")}</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Children Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-200 flex items-center">
            <span className="mr-2">👶</span>
            {t("family.children")} ({children.length})
          </h2>
          <button
            onClick={() => setShowAddChildModal(true)}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition"
          >
            <span>➕</span>
            <span>{t("family.addChild")}</span>
          </button>
        </div>

        {children.length === 0 ? (
          <div className="bg-white/5 border-2 border-dashed border-white/20 rounded-lg p-12 text-center">
            <p className="text-slate-400 mb-4">{t("family.noChildren")}</p>
            <button
              onClick={() => setShowAddChildModal(true)}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg inline-flex items-center space-x-2 transition"
            >
              <span>➕</span>
              <span>{t("family.addFirstChild")}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {children.map((child) => (
              <div
                key={child.id}
                className="dark-card border-2 border-yellow-500/30 rounded-lg p-6 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-yellow-500/15 rounded-full flex items-center justify-center text-2xl">
                      🧒
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{child.name}</h3>
                      {child.email && (
                        <p className="text-sm text-slate-400">{child.email}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        {t("family.joined")}: {new Date(child.created_at).toLocaleDateString(locale)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col space-y-2 mt-4 pt-4 border-t border-white/10">
                  <Link
                    href={`/${locale}/admin/children/${child.id}`}
                    className="text-sm text-primary hover:text-primary/80 font-semibold text-left flex items-center space-x-2"
                  >
                    <span>📊</span>
                    <span>{t("family.viewDetails")}</span>
                  </Link>
                  <button
                    onClick={() => setEditingChild(child)}
                    className="text-sm text-blue-300 hover:text-blue-200 text-left flex items-center space-x-2"
                  >
                    <span>✏️</span>
                    <span>{t("family.editInfo")}</span>
                  </button>
                  <button
                    onClick={() => setResettingPasswordChild(child)}
                    className="text-sm text-orange-300 hover:text-orange-200 text-left flex items-center space-x-2"
                  >
                    <span>🔑</span>
                    <span>{t("family.resetPassword")}</span>
                  </button>
                  <button
                    onClick={() => handleDeleteChild(child)}
                    className="text-sm text-red-400 hover:text-red-300 text-left flex items-center space-x-2"
                  >
                    <span>🗑️</span>
                    <span>{t("family.deleteChild")}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Modals */}
      {showAddChildModal && (
        <AddChildModal
          familyId={currentUser.family_id!}
          locale={locale}
          onClose={() => setShowAddChildModal(false)}
          onSuccess={() => {
            setShowAddChildModal(false);
            router.refresh();
          }}
        />
      )}

      {editingChild && (
        <EditChildModal
          child={editingChild}
          locale={locale}
          onClose={() => setEditingChild(null)}
          onSuccess={() => {
            setEditingChild(null);
            router.refresh();
          }}
        />
      )}

      {editingParent && (
        <EditParentModal
          parent={editingParent}
          locale={locale}
          onClose={() => setEditingParent(null)}
          onSuccess={() => {
            setEditingParent(null);
            router.refresh();
          }}
        />
      )}

      {resettingPasswordChild && (
        <ResetPasswordModal
          child={resettingPasswordChild}
          locale={locale}
          onClose={() => setResettingPasswordChild(null)}
        />
      )}
    </div>
  );
}
