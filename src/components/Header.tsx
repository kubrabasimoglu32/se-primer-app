/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BookOpen, Terminal, RotateCcw } from "lucide-react";
import { ProjeKarti } from "../types/sePrimer";

interface HeaderProps {
  proje: ProjeKarti | null;
  onSifirla?: () => void;
  ekran: "tanisma" | "nedegisti" | "soru" | "projem";
  onEkranaGit?: (ekran: "nedegisti" | "projem") => void;
}

export const Header: React.FC<HeaderProps> = ({ proje, onSifirla, ekran, onEkranaGit }) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FFFFFF] border-b border-[#E2E8F0] shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04)]">
      <div className="max-w-md mx-auto px-4 py-2.5 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded bg-[#0F172A] flex items-center justify-center text-[#FFFFFF] shadow-sm">
            <Terminal className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-mono text-xs font-bold tracking-wider text-[#0F172A]">SE PRIMER</span>
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 bg-[#F1F5F9] text-[#515F74] rounded border border-[#CBD5E1]">v1.0</span>
            </div>
            <p className="text-[11px] text-[#515F74] leading-none">Mühendislik Defteri & Mentor</p>
          </div>
        </div>

        {/* Right Action */}
        <div className="flex items-center space-x-2">
          {proje && (
            <>
              {ekran !== "projem" && onEkranaGit && (
                <button
                  type="button"
                  data-cy="projem-goruntule"
                  onClick={() => onEkranaGit("projem")}
                  className="px-2.5 py-1 text-xs font-mono font-medium text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] rounded hover:bg-[#F1F5F9] transition-colors flex items-center space-x-1"
                >
                  <BookOpen className="w-3.5 h-3.5 text-[#334155]" />
                  <span>Projem</span>
                </button>
              )}

              {onSifirla && (
                <button
                  type="button"
                  data-cy="proje-sifirla"
                  onClick={onSifirla}
                  title="Projeyi sıfırla veya yeni proje başlat"
                  className="p-1.5 text-[#515F74] hover:text-[#DC2626] hover:bg-[#FEE2E2] rounded transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};
