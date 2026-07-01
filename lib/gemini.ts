'use server';

import { GoogleGenAI } from '@google/genai';
import { CLASS_MEMBERS } from './classroom';

// 초등 자치법정용 표준 민법/형법 가이드라인 기준 정의
const ELEMENTARY_LAW_GUIDE = `
[초등 자치법정 표준 민법 가이드 (대인/재산 갈등 해결)]
- 제1조(대여물 반환): 친구에게 빌린 물건(학용품, 장난감 등)은 약속한 시간에 온전한 상태로 돌려주어야 한다.
- 제2조(손해 배상): 친구의 물건을 망가뜨리거나 분실했을 경우, 진심 어린 사과와 함께 똑같은 물건으로 보상하거나 그에 상응하는 책임(교실 청소 대행, 양보 등)을 져야 한다.
- 제3조(권리 침해): 친구의 동의 없이 물건을 사용하거나, 정당한 권리(모둠 활동 참여 등)를 방해해서는 안 된다.

[초등 자치법정 표준 형법 가이드 (학급 질서 및 안전 유지)]
- 第1조(언어폭력 및 모욕): 친구에게 비속어를 쓰거나, 외모 비하, 놀림, 따돌림 유도 등 마음에 상처를 주는 행위는 금지된다.
- 第2조(신체 침해 및 위협): 복도나 교실에서 뛰어다니다 친구와 부딪히는 행위, 장난을 빙자하여 때리거나 위협하는 행위는 엄격히 제한된다.
- 第3조(공동체 질서 교란): 수업 시간을 고의로 방해하거나, 학급 전체가 정한 약속(1인 1역, 청소 구역 등)을 정당한 이유 없이 상습적으로 거부하는 행위는 처벌 대상이다.
`;

export async function analyzeCase(content: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        당신은 초등학교 6학년 학급 자치 법정의 공정한 'AI 배심원'입니다.
        아래의 표준 가이드라인을 기준으로 학생이 제출한 상황을 분석해 주세요.

        [학급 자치법정 표준 가이드라인]
        ${ELEMENTARY_LAW_GUIDE}

        [분석할 상황]
        "${content}"

        [답변 양식]
        1. 상황 요약: 어떤 일이 있었는지 핵심만 1줄 요약
        2. 위반 가능성이 있는 항목: (위의 표준 가이드라인 중 매칭되는 조항 언급)
        3. AI 배심원의 제안: 갈등을 평화롭게 해결하기 위해 해당 학생이 취해야 할 행동 추천 (예: 진심 어린 사과, 교실 청소 돕기 등)
      `,
    });
    return response.text;
  } catch (error) {
    console.error('Gemini AI 분석 실패:', error);
    return 'AI 배심원이 상황을 분석하는 데 실패했습니다.';
  }
}

export async function setupCourtTrial(caseContent: string, reporter: string, relationsData: any[]) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const membersList = CLASS_MEMBERS.map(m => `${m.id}(출석번호:${m.no}번)`).join(', ');
    const relationsSummary = relationsData.map(r => 
      `작성자:${r.submitter} / 친한친구들:${r.goodFriends?.join(',')} / 속상하게한친구:${r.badFriend || '없음'}`
    ).join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        당신은 초등학교 6학년 학급 자치 법정의 '재판 관리 AI'입니다.
        아래 법률 가이드라인과 인간관계 데이터를 바탕으로 공정하고 객관적인 정식 재판부를 구성해 주세요.
        반드시 모든 결과에 가명 ID(STU_XX)를 사용해야 합니다.

        [학급 자치법정 표준 가이드라인]
        ${ELEMENTARY_LAW_GUIDE}

        [우리 반 전체 학생 ID 명단]
        ${membersList}

        [현재 사건 개요]
        - 신고자(원고): ${reporter}
        - 사건 내용(가명화됨): "${caseContent}"

        [누적된 학급 관계 데이터 수집본]
        ${relationsSummary}

        [재판부 구성 필수 지침]
        1. 민사 / 형사 구분: 제공된 표준 가이드라인을 기반으로, 개인 간의 물질적 피해나 권리 침해에 가까우면 '민사재판', 학급 공동체의 질서와 안전을 해치는 폭력/위협 행위라면 '형사재판'으로 명확히 분류하고 근거 조항을 대세요.
        2. 제척 대상 제외: 원고(${reporter}) 본인 및 문장 속 사건 당사자들은 명단에서 무조건 제외합니다.
        3. 배심원단 상대적 최적화 선출: 관계 데이터가 쌓여 우리 반 학생 대부분이 감정적으로 조금씩 얽혀있더라도 "적절한 인원이 없다"고 포기해서는 절대 안 됩니다. 누적 데이터 중에서 [원고와 이번 사건 관계자들에 대해 최근 형성된 긍정/부정적 교류나 감정적 편향이 '가장 적은 상대적 중립 학생'] 3명의 ID를 어떻게든 연산하여 배심원으로 임명해 주세요. 선정 사유에 차선책으로 선출되었다는 맥락을 설득력 있게 녹여내세요.
        4. 역할군 선정:
           - '형사' 재판인 경우: 비교적 객관적인 학급 검사(STU_XX) 1명, 피고측 변호인(STU_XX) 1명 지정.
           - '민사' 재판인 경우: 원고측 대리인(STU_XX) 1명, 피고측 대리인(STU_XX) 1명 지정.

        [답변 양식]
        🏛️ 대운초 자치법정 정식 재판부 구성 보고서
        
        1. 재판 성격 분류: [민사재판 또는 형사재판] (표준 가이드라인 근거 조항 및 이유 요약)
        2. 객관적 배심원단 (3명): [STU_XX, STU_XX, STU_XX] (선정 사유 포함)
        3. 재판부 구성:
           - 변호인: [STU_XX]
           - 검사(또는 원고 대리인): [STU_XX]
        4. 재판 핵심 쟁점 가이드: AI 배심원이 조언하는 자치 법정 가이드라인
      `,
    });

    return response.text;
  } catch (error) {
    console.error('재판부 구성 실패:', error);
    return 'AI가 관계 데이터를 분석하여 재판부를 구성하는 데 실패했습니다.';
  }
}