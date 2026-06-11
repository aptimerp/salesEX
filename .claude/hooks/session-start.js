#!/usr/bin/env node
// 세션 시작 시 STATE.md를 읽어 AI 컨텍스트로 자동 주입

const fs = require('fs');
const path = require('path');

function loadFile(relativePath) {
  const fullPath = path.join(process.cwd(), relativePath);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf-8');
}

function main() {
  const state = loadFile('.planning/STATE.md');
  const roadmap = loadFile('.planning/ROADMAP.md');

  console.log('=== 세션 시작 컨텍스트 ===\n');

  if (!state) {
    console.log('⚠ STATE.md 없음 — 새 프로젝트입니다. /시작 명령으로 시작하세요.');
  } else {
    console.log('## 현재 상태 (STATE.md)\n');
    // 마지막 80줄만 출력 (컨텍스트 절약)
    const lines = state.split('\n').slice(-80);
    console.log(lines.join('\n'));
  }

  if (roadmap) {
    console.log('\n\n## 로드맵 (ROADMAP.md 요약)\n');
    // 진행 중·예정 페이즈만 추출
    const lines = roadmap.split('\n').filter(line =>
      line.includes('🔜') || line.includes('⏳') || line.includes('Phase')
    ).slice(0, 20);
    console.log(lines.join('\n'));
  }

  console.log('\n\n=== 위 컨텍스트 기반으로 작업 이어가세요 ===\n');
}

main();
