'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { analyzeCase, setupCourtTrial } from '@/lib/gemini';
import { anonymizeText, getStudentIdByName, deanonymizeText } from '@/lib/anonymize';

export default function Home() {
  const [view, setView] = useState<'menu' | 'report' | 'friend'>('menu');
  const [isLoading, setIsLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  
  // 정식 재판 결과창 전용 상자
  const [trialResult, setTrialResult] = useState('');
  // 불복 버튼을 띄우기 위해 현재 신고 상태를 임시 저장할 상자들
  const [currentEncryptedContent, setCurrentEncryptedContent] = useState('');
  const [currentEncryptedReporter, setCurrentEncryptedReporter] = useState('');

  // 🚨 사건 신고용 상자
  const [reporter, setReporter] = useState('');
  const [content, setContent] = useState('');

  // 🤝 오늘의 마음 & 친구 기록용 상자
  const [myName, setMyName] = useState('');
  const [goodFriends, setGoodFriends] = useState('');
  const [badFriend, setBadFriend] = useState('');
  const [story, setStory] = useState('');

  // 🚨 사건 신고 제출
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAiResult('');
    setTrialResult('');

    try {
      const encryptedReporter = await getStudentIdByName(reporter);
      const encryptedContent = await anonymizeText(content);

      // 불복 시 재판 청구를 위해 상태 기억
      setCurrentEncryptedReporter(encryptedReporter);
      setCurrentEncryptedContent(encryptedContent);

      await addDoc(collection(db, 'cases'), {
        studentName: encryptedReporter,
        content: encryptedContent,
        createdAt: serverTimestamp(),
      });

      const encryptedResult = await analyzeCase(encryptedContent);
      const decryptedResult = await deanonymizeText(encryptedResult || "");
      setAiResult(decryptedResult);

      alert(`성공적으로 사건이 접수되어 1차 AI 분석이 완료되었습니다!`);
      setReporter('');
      setContent('');
    } catch (error) {
      console.error(error);
      alert('접수 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // ⚠️ 정식 재판 청구 핸들러 (관계 DB 결합 알고리즘 가동 🚀)
  const handleRequestTrial = async () => {
    setIsLoading(true);
    setTrialResult('');

    try {
      // 1. Firebase 'relations' 창고에 쌓인 우리 반 마음 데이터 전부 긁어오기!
      const querySnapshot = await getDocs(collection(db, 'relations'));
      const relationsData: any[] = [];
      querySnapshot.forEach((doc) => {
        relationsData.push(doc.data());
      });

      // 2. AI에게 사건 내용과 누적 관계 매트릭스 데이터를 넘겨 재판부 선정 요청
      const encryptedTrialReport = await setupCourtTrial(
        currentEncryptedContent,
        currentEncryptedReporter,
        relationsData
      );

      // 3. AI가 지정해준 배심원단 코드(STU_XX)를 다시 친숙한 아이들 실명으로 번역! 🔓
      const decryptedTrialReport = await deanonymizeText(encryptedTrialReport || "");
      setTrialResult(decryptedTrialReport);

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

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 gap-6">
      
      {/* [메뉴 선택 화면] */}
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
          </div>
        </div>
      )}

      {/* [트랙 A: 사건 신고창] */}
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

      {/* [트랙 B: 오늘의 마음 & 친구 기록창] */}
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

      {/* 1차 AI 배심원 분석 리포트 창 */}
      {aiResult && (
        <div className="w-full max-w-md bg-emerald-50 rounded-2xl shadow-lg p-6 border border-emerald-100 flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-bold text-emerald-800 mb-3 flex items-center gap-2">🤖 AI 배심원의 1차 분석 리포트</h3>
            <div className="text-sm text-emerald-950 whitespace-pre-wrap leading-relaxed">{aiResult}</div>
          </div>
          
          {/* ⚠️ 불복 및 정식 재판 청구 버튼 (신규 추가 ⭐) */}
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

      {/* 🏛️ 정식 재판부 자동 구성 결과창 (신규 추가 ⭐) */}
      {trialResult && (
        <div className="w-full max-w-md bg-indigo-50 rounded-2xl shadow-lg p-6 border border-indigo-100 animate-fade-in">
          <h3 className="text-lg font-bold text-indigo-800 mb-3 flex items-center gap-2">🏛️ AI 정식 재판부 매칭 결과</h3>
          <div className="text-sm text-indigo-950 whitespace-pre-wrap leading-relaxed">{trialResult}</div>
        </div>
      )}
    </main>
  );
}