'use server';

import { CLASS_MEMBERS } from './classroom';

/**
 * 1. 실명 ──> 가명 코드 변환 함수 (아이들이 입력했을 때 가동)
 * 예: "홍길동" ──> "STU_16" / "홍길동이 밀었어요" ──> "STU_16이 밀었어요"
 */
export async function anonymizeText(text: string): Promise<string> {
  if (!text) return text;
  let anonymized = text;

  // 명렬표를 돌면서 문장 속에 실명이 있으면 코드로 싹 치환합니다.
  CLASS_MEMBERS.forEach((student) => {
    // 혹시 모를 띄어쓰기나 오차 방지를 위해 전역 치환(정규식) 사용
    const regex = new RegExp(student.name, 'g');
    anonymized = anonymized.replace(regex, student.id);
  });

  return anonymized;
}

/**
 * 2. 가명 코드 ──> 실명 변환 함수 (선생님 화면이나 필요 시 가동)
 * 예: "STU_16" ──> "홍길동" / "STU_16이 밀었어요" ──> "홍길동이 밀었어요"
 */
export async function deanonymizeText(text: string): Promise<string> {
  if (!text) return text;
  let decrypted = text;

  CLASS_MEMBERS.forEach((student) => {
    const regex = new RegExp(student.id, 'g');
    decrypted = decrypted.replace(regex, student.name);
  });

  return decrypted;
}

/**
 * 3. 단일 이름에 대한 가명 ID 조회 함수
 */
export async function getStudentIdByName(name: string): Promise<string> {
  const student = CLASS_MEMBERS.find(s => s.name === name.trim());
  return student ? student.id : name; // 명렬표에 없으면 그대로 반환
}