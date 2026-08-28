'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { analyzeCase, setupCourtTrial } from '@/lib/gemini';
import { anonymizeText, getStudentIdByName, deanonymizeText } from '@/lib/anonymize';

// 🔒 관리자 모드용 사건 데이터 타입 정의
export interface CaseRecord {
  id: string;
  createdAt: string;
  plaintiff: string;
  defendant: string;
  title: string;
  content: string;
  aiAnalysis?: string;
  juryList?: string[];
  status: "접수완료" | "재판진행중" | "판결완료";
}

// 🔒 관리자 대시보드 컴포넌트 (Firebase 데이터 연동 완료)
function AdminDashboard({
  cases,
  onRefresh,
  onDeleteCase,
  onUpdateStatus,
}: {
  cases: CaseRecord[];
  onRefresh: () => void;
  onDeleteCase: (id: string) => void;
  onUpdateStatus: (id: string, status: CaseRecord["status"]) => void;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputPassword, setInputPassword] = useState("");
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);

  const ADMIN_PIN = "1234";

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPassword === ADMIN_PIN) {
      setIsAuthenticated(true);
      setInputPassword("");
      onRefresh(); // 관리자 로그인 시 최신 데이터 불러오기
    } else {
      alert("관리자 비밀번호가 일치하지 않습니다.");
      setInputPassword("");
    }
  };

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
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-md shadow-sm font-medium"
          >
            🔄새로고침
          </button>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="text-xs text-slate-500 hover:text-slate-800 bg-white border border-slate-300 px-3 py-1.5 rounded-md shadow-sm"
          >
            로그아웃
          </button>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
              <th className="p-3.5 font-semibold">접수일시</th>
              <th className="p-3.5 font-semibold">신청자 (원고)</th>
              <th className="p-3.5 font-semibold">사건 내용 요약</th>
              <th className="p-3.5 font-semibold">상태</th>
              <th className="p-3.5 font-semibold text-center">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cases.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  현재 접수된 사건 내역이 없습니다. (새로고침을 눌러보세요)
                </td>
              </tr>
            ) : (
              cases.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="p-3.5 text-slate-500 text-xs">{item.createdAt}</td>
                  <td className="p-3.5 font-medium text-slate-800">{item.plaintiff}</td>
                  <td className="p-3.5 text-slate-700 max-w-xs truncate">{item.title}</td>
                  <td className="p-3.5">
                    <select
                      value={item.status}
                      onChange={(e) =>
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
              <p><strong>신청 학생 코드:</strong> {selectedCase.plaintiff}</p>
              <p className="text-slate-500 text-xs mt-2"><strong>접수 일시:</strong> {selectedCase.createdAt}</p>
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-500 uppercase">사건 원문 내용</h4>
              <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-xl border border-slate-100">
                {selectedCase.content}
              </p>
            </div>

            {selectedCase.aiAnalysis && (
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-indigo-600 uppercase">🤖 AI 분석 및 재판부 리포트</h4>
                <div className="text-sm text-slate-700 whitespace-pre-wrap bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100">
                  {selectedCase.aiAnalysis}
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

// 🏛️ 메인 홈 컴포넌트
export default function Home() {
  const [view, setView] = useState<'menu' | 'report' | 'friend' | 'admin'>('menu');
  const [isLoading, setIsLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [trialResult, setTrialResult] = useState('');
  const [currentEncryptedContent, setCurrentEncryptedContent] = useState('');
  const [currentEncryptedReporter, setCurrentEncryptedReporter] = useState('');
  const [currentDocId, setCurrentDocId] = useState(''); // Firestore 문서 ID 보관용

  const [reporter, setReporter] = useState('');
  const [content, setContent] = useState('');

  const [myName, setMyName] = useState('');
  const [goodFriends, setGoodFriends] = useState('');
  const [badFriend, setBadFriend] = useState('');
  const [story, setStory] = useState('');

  const [caseList, setCaseList] = useState<CaseRecord[]>([]);

  // 🔄 Firebase에서 사건 목록 불러오기 함수
  const fetchCasesFromFirestore = async () => {
    try {
      const q = query(collection(db, 'cases'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const loadedCases: CaseRecord[] = [];
      
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loadedCases.push({
          id: docSnap.id,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString('ko-KR') : '방금 전',
          plaintiff: data.studentName || '익명',
          defendant: '관계 DB 참조',
          title: data.content ? data.content.slice(0, 25) + '...' : '제목 없음',
          content: data.content || '',
          aiAnalysis: data.aiAnalysis || '아직 1차 분석 전이거나 저장되지 않음',
          status: data.status || '접수완료',
        });
      });

      setCaseList(loadedCases);
    } catch (error) {
      console.error("사건 불러오기 실패:", error);
    }
  };

  // 관리자 모드 진입 시 자동 로드
  useEffect(() => {
    if (view === 'admin') {
      fetchCasesFromFirestore();
    }
  }, [view]);

  // 🚨 사건 신고 제출
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAiResult('');
    setTrialResult('');

    try {
      const encryptedReporter = await getStudentIdByName(reporter);
      const encryptedContent = await anonymizeText(content);

      setCurrentEncryptedReporter(encryptedReporter);
      setCurrentEncryptedContent(encryptedContent);

      const encryptedResult = await analyzeCase(encryptedContent);
      const decryptedResult = await deanonymizeText(encryptedResult || "");
      setAiResult(decryptedResult);

      // Firestore에 1차 분석 결과와 상태까지 함께 저장!
      const docRef = await addDoc(collection(db, 'cases'), {
        studentName: encryptedReporter,
        content: encryptedContent,
        aiAnalysis: decryptedResult,
        status: '접수완료',
        createdAt: serverTimestamp(),
      });

      setCurrentDocId(docRef.id);

      alert('성공적으로 사건이 접수되어 1차 AI 분석이 완료되었습니다!');
      setReporter('');
      setContent('');
    } catch (error) {
      console.error(error);
      alert('접수 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // ⚠️ 정식 재판 청구 핸들러
  const handleRequestTrial = async () => {
    setIsLoading(true);
    setTrialResult('');

    try {
      const querySnapshot = await getDocs(collection(db, 'relations'));
      const relationsData: any[] = [];
      querySnapshot.forEach((doc) => {
        relationsData.push(doc.data());
      });

      const encryptedTrialReport = await setupCourtTrial(
        currentEncryptedContent,
        currentEncryptedReporter,
        relationsData
      );

      const decryptedTrialReport = await deanonymizeText(encryptedTrialReport || "");
      setTrialResult(decryptedTrialReport);

      // 만약 방금 접수한 문서 ID가 있다면 Firestore에 재판 결과 업데이트
      if (currentDocId) {
        const docRef = doc(db, 'cases', currentDocId);
        await updateDoc(docRef, {
          aiAnalysis: `[1차 분석 리포트]\n${aiResult}\n\n[정식 재판부 결과]\n${decryptedTrialReport}`,
          status: '재판진행중',
        });
      }

      alert('관계 DB 분석을 바탕으로 객관적인 정식 재판부가 구성되었습니다! 🏛️');
    } catch (error) {
      console.error(error);
      alert('재판부 구성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 🤝 오늘의 마음 & 친구 기록 제출
  const handleFriendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const friendsNames = goodFriends.split(',').map(name => name.trim()).filter(name => name !== '');
      const encryptedFriendsArray = await Promise.all(
        friendsNames.map(name => getStudentIdByName(name))
      );

      const encryptedBadFriend = badFriend.trim() ? await getStudentIdByName(badFriend) : '';
      const encryptedStory = await anonymizeText(story);
      const encryptedMyName = await getStudentIdByName(myName);

      await addDoc(collection(db, 'relations'), {
        submitter: encryptedMyName,
        goodFriends: encryptedFriendsArray,
        badFriend: encryptedBadFriend,
        story: encryptedStory,
        createdAt: serverTimestamp(),
      });

      alert('오늘의 마음과 관계 기록이 안전하게 저장되었습니다! 🤝');
      setMyName('');
      setGoodFriends('');
      setBadFriend('');
      setStory('');
      setView('menu');
    } catch (error) {
      console.error(error);
      alert('기록 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 🗑️ 관리자: 사건 삭제
  const handleDeleteCase = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'cases', id));
      setCaseList((prev) => prev.filter((c) => c.id !== id));
      alert("사건이 삭제되었습니다.");
    } catch (error) {
      console.error("삭제 실패:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  // ⚙️ 관리자: 사건 상태 변경
  const handleUpdateStatus = async (id: string, status: CaseRecord["status"]) => {
    try {
      const docRef = doc(db, 'cases', id);
      await updateDoc(docRef, { status });
      setCaseList((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status } : c))
      );
    } catch (error) {
      console.error("상태 변경 실패:", error);
      alert("상태 변경 중 오류가 발생했습니다.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 gap-6">
      {view === 'menu' && (
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-100 text-center">
          <h1 className="text-3xl font-extrabold text-indigo-600 tracking-tight mb-2">🏛️ ClassCourt-AI</h1>
          <p className="text-sm font-medium text-slate-500 mb-8">대운초등학교 6학년 자치 법정 시스템</p>
          
          <div className="flex flex-col gap-4">
            <button
              onClick={() => setView('report')}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-4 px-4 rounded-xl shadow-lg transition-all active:scale-[0.98] text-lg"
            >
              🚨 학급 규칙 위반 신고하기
            </button>
            <button
              onClick={() => setView('friend')}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-4 rounded-xl shadow-lg transition-all active:scale-[0.98] text-lg"
            >
              🤝 오늘의 '마음 & 친구' 기록하기
            </button>
            <button
              onClick={() => setView('admin')}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 px-4 rounded-xl shadow transition-all active:scale-[0.98] text-sm mt-2"
            >
              🔒 교사 전용 관리자 모드
            </button>
          </div>
        </div>
      )}

      {view === 'report' && (
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">🚨 사건 접수처</h2>
            <button onClick={() => { setView('menu'); setAiResult(''); setTrialResult(''); }} className="text-sm text-slate-400 hover:text-slate-600">◀ 메뉴로</button>
          </div>

          <form onSubmit={handleReportSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">본인 이름</label>
              <input type="text" value={reporter} onChange={(e) => setReporter(e.target.value)} placeholder="실명을 입력하세요" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800" required disabled={isLoading} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">상황 설명</label>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 resize-none" placeholder="예: 오늘 홍길동이 제 필통을 던져서 부서졌습니다." required disabled={isLoading} />
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-bold py-3 px-4 rounded-xl shadow-md">
              {isLoading ? '⚖️ AI 분석 중...' : '⚖️ AI 배심원단에게 제출'}
            </button>
          </form>
        </div>
      )}

      {view === 'friend' && (
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">🤝 오늘의 마음 & 친구</h2>
            <button onClick={() => setView('menu')} className="text-sm text-slate-400 hover:text-slate-600">◀ 돌아가기</button>
          </div>

          <form onSubmit={handleFriendSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">내 이름</label>
              <input type="text" value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="실명을 입력하세요" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">오늘 즐겁게 함께한 친구(들)</label>
              <input type="text" value={goodFriends} onChange={(e) => setGoodFriends(e.target.value)} placeholder="예: 김서연, 김지우 (쉼표로 구분)" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">오늘 나를 속상하게 한 친구 (선택)</label>
              <input type="text" value={badFriend} onChange={(e) => setBadFriend(e.target.value)} placeholder="예: 홍길동" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">오늘 있었던 일과 마음 설명</label>
              <textarea value={story} onChange={(e) => setStory(e.target.value)} rows={4} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 resize-none" placeholder="하루 일과를 자유롭게 적어주세요." required />
            </div>
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-md">
              보내기 및 저장 🤝
            </button>
          </form>
        </div>
      )}

      {view === 'admin' && (
        <div className="w-full max-w-4xl space-y-4">
          <div className="flex justify-start">
            <button
              onClick={() => setView('menu')}
              className="text-sm font-medium text-slate-600 bg-white border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 shadow-sm"
            >
              ◀ 홈 메뉴로 돌아가기
            </button>
          </div>
          <AdminDashboard
            cases={caseList}
            onRefresh={fetchCasesFromFirestore}
            onDeleteCase={handleDeleteCase}
            onUpdateStatus={handleUpdateStatus}
          />
        </div>
      )}

      {aiResult && view === 'report' && (
        <div className="w-full max-w-md bg-emerald-50 rounded-2xl shadow-lg p-6 border border-emerald-100 flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-bold text-emerald-800 mb-3 flex items-center gap-2">🤖 AI 배심원의 1차 분석 리포트</h3>
            <div className="text-sm text-emerald-950 whitespace-pre-wrap leading-relaxed">{aiResult}</div>
          </div>
          
          {!trialResult && (
            <button
              onClick={handleRequestTrial}
              disabled={isLoading}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-md text-sm mt-2"
            >
              {isLoading ? '🔍 관계 DB 분석 및 재판부 선출 중...' : '⚠️ 1차 판결 불복: 정식 재판 청구하기'}
            </button>
          )}
        </div>
      )}

      {trialResult && view === 'report' && (
        <div className="w-full max-w-md bg-indigo-50 rounded-2xl shadow-lg p-6 border border-indigo-100">
          <h3 className="text-lg font-bold text-indigo-800 mb-3 flex items-center gap-2">🏛️ AI 정식 재판부 매칭 결과</h3>
          <div className="text-sm text-indigo-950 whitespace-pre-wrap leading-relaxed">{trialResult}</div>
        </div>
      )}
    </main>
  );
}
