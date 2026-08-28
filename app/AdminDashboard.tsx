"use client";

import React, { useState } from "react";

export interface CaseRecord {
  id: string;
  createdAt: string;
  plaintiff: string;   // 원고
  defendant: string;   // 피고
  title: string;
  content: string;
  aiAnalysis?: string; // 1차 AI 분석 결과 (실명 복호화본)
  juryList?: string[]; // 배정된 배심원 명단
  status: "접수완료" | "재판진행중" | "판결완료";
}

interface AdminDashboardProps {
  cases: CaseRecord[];
  onDeleteCase?: (id: string) => void;
  onUpdateStatus?: (id: string, status: CaseRecord["status"]) => void;
}

export default function AdminDashboard({
  cases,
  onDeleteCase,
  onUpdateStatus,
}: AdminDashboardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputPassword, setInputPassword] = useState("");
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);

  // 🔑 관리자 비밀번호 (원하는 비밀번호로 변경 가능)
  const ADMIN_PIN = "1234";

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPassword === ADMIN_PIN) {
      setIsAuthenticated(true);
      setInputPassword("");
    } else {
      alert("관리자 비밀번호가 일치하지 않습니다.");
      setInputPassword("");
    }
  };

  // 1. 미인증 시 비밀번호 입력 화면
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-md border border-slate-200 max-w-md mx-auto my-8">
        <div className="text-3xl mb-3">🔒</div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">교사 전용 관리자 모드</h2>
        <p className="text-sm text-slate-500 mb-6 text-center">
          학급 법정 사건 종합 조회를 위해 관리자 비밀번호를 입력해주세요.
        </p>
        <form onSubmit={handleLogin} className="w-full space-y-3">
          <input
            type="password"
            placeholder="비밀번호 4자리"
            value={inputPassword}
            onChange={(e) => setInputPassword(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="w-full bg-slate-900 text-white font-medium py-2.5 rounded-lg hover:bg-slate-800 transition"
          >
            관리자 접속
          </button>
        </form>
      </div>
    );
  }

  // 2. 인증 완료 후 대시보드 화면
  return (
    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm max-w-5xl mx-auto my-8 space-y-6">
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            🏛️ 학급 법정 통합 관리 대시보드
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            총 <span className="font-semibold text-indigo-600">{cases.length}</span>건의 사건이 접수되어 있습니다.
          </p>
        </div>
        <button
          onClick={() => setIsAuthenticated(false)}
          className="text-xs text-slate-500 hover:text-slate-800 bg-white border border-slate-300 px-3 py-1.5 rounded-md shadow-sm"
        >
          관리자 로그아웃
        </button>
      </div>

      {/* 사건 목록 테이블 */}
      <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
              <th className="p-3.5 font-semibold">접수일시</th>
              <th className="p-3.5 font-semibold">당사자 (원고 vs 피고)</th>
              <th className="p-3.5 font-semibold">사건 제목</th>
              <th className="p-3.5 font-semibold">상태</th>
              <th className="p-3.5 font-semibold text-center">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cases.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  현재 접수된 사건 내역이 없습니다.
                </td>
              </tr>
            ) : (
              cases.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="p-3.5 text-slate-500 text-xs">{item.createdAt}</td>
                  <td className="p-3.5 font-medium text-slate-800">
                    <span className="text-blue-600">{item.plaintiff}</span> vs{" "}
                    <span className="text-red-600">{item.defendant}</span>
                  </td>
                  <td className="p-3.5 text-slate-700 max-w-xs truncate">{item.title}</td>
                  <td className="p-3.5">
                    <select
                      value={item.status}
                      onChange={(e) =>
                        onUpdateStatus &&
                        onUpdateStatus(item.id, e.target.value as CaseRecord["status"])
                      }
                      className="text-xs bg-slate-100 border border-slate-300 rounded px-2 py-1 font-medium focus:outline-none"
                    >
                      <option value="접수완료">접수완료</option>
                      <option value="재판진행중">재판진행중</option>
                      <option value="판결완료">판결완료</option>
                    </select>
                  </td>
                  <td className="p-3.5 text-center space-x-2">
                    <button
                      onClick={() => setSelectedCase(item)}
                      className="px-2.5 py-1 text-xs bg-indigo-50 text-indigo-600 font-medium rounded hover:bg-indigo-100 transition"
                    >
                      상세·AI분석
                    </button>
                    {onDeleteCase && (
                      <button
                        onClick={() => {
                          if (confirm("정말 이 사건을 삭제하시겠습니까?")) {
                            onDeleteCase(item.id);
                          }
                        }}
                        className="px-2 py-1 text-xs text-rose-500 hover:bg-rose-50 rounded transition"
                      >
                        삭제
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 사건 상세 & AI 분석 결과 모달 */}
      {selectedCase && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                  {selectedCase.status}
                </span>
                <h3 className="text-lg font-bold text-slate-800 mt-1">
                  {selectedCase.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-sm bg-slate-50 p-3.5 rounded-xl space-y-1">
              <p><strong>원고:</strong> {selectedCase.plaintiff}</p>
              <p><strong>피고:</strong> {selectedCase.defendant}</p>
              <p className="text-slate-500 text-xs mt-2"><strong>접수 일시:</strong> {selectedCase.createdAt}</p>
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-500 uppercase">사건 내용</h4>
              <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-xl border border-slate-100">
                {selectedCase.content}
              </p>
            </div>

            {selectedCase.aiAnalysis && (
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-indigo-600 uppercase">🤖 AI 1차 법률 분석 및 권고안</h4>
                <div className="text-sm text-slate-700 whitespace-pre-wrap bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100">
                  {selectedCase.aiAnalysis}
                </div>
              </div>
            )}

            {selectedCase.juryList && selectedCase.juryList.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-emerald-600 uppercase">👥 배정된 배심원단 명단</h4>
                <div className="flex flex-wrap gap-1.5 p-2 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  {selectedCase.juryList.map((juror, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-medium bg-white text-emerald-800 border border-emerald-200 px-2 py-1 rounded-md shadow-xs"
                    >
                      {juror}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedCase(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
