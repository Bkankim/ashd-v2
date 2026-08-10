import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보처리방침 - ASHD",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold mb-8">개인정보처리방침</h1>

      <div className="prose prose-sm max-w-none space-y-6">
        <p className="text-sm text-gray-500">
          시행일: 2026년 3월 13일 (최초 시행일: 2026년 2월 16일)
        </p>

        <section>
          <h2 className="text-lg font-semibold mt-6 mb-2">
            1. 개인정보의 수집 및 이용 목적
          </h2>
          <p>
            ASHD(이하 &quot;서비스&quot;)는 다음 목적을 위해 개인정보를
            수집합니다:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>회원 가입 및 인증 (이메일, 비밀번호)</li>
            <li>
              제품 보증/환불 기한 관리 (구매 정보, 영수증/보증서 이미지)
            </li>
            <li>기한 임박 시 이메일/텔레그램 알림 발송</li>
            <li>서비스 이용 통계 및 개선</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-6 mb-2">
            2. 수집하는 개인정보 항목
          </h2>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>
              <strong>필수 항목:</strong> 이메일 주소, 비밀번호(암호화 저장)
            </li>
            <li>
              <strong>선택 항목:</strong> 제품 구매 정보(매장명, 금액, 구매일,
              주문번호), 영수증/보증서 이미지, 텔레그램 Chat ID 및 사용자명
            </li>
            <li>
              <strong>자동 수집 항목:</strong> IP 주소, 접속 로그(접속 일시,
              이용 기록), 쿠키(인증 세션 유지 목적), OCR로 추출된 텍스트
              데이터(영수증 내 정보)
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-6 mb-2">
            3. 개인정보의 보유 및 이용 기간
          </h2>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>
              보유 기간: 회원 자격 유지 기간 동안 보유하며, 탈퇴 즉시 삭제
            </li>
            <li>
              회원 탈퇴 시: 모든 개인정보를 지체 없이 파기합니다
            </li>
            <li>
              법령에 의한 보관: 관련 법령에 따라 보관 의무가 있는 경우 해당
              기간 동안 보관
            </li>
          </ul>
          <h3 className="text-base font-medium mt-4 mb-1">파기 절차 및 방법</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>
              <strong>전자적 파일:</strong> 복원이 불가능한 방법으로
              영구 삭제합니다 (데이터베이스 레코드 삭제 및 Storage 파일 삭제)
            </li>
            <li>
              <strong>기록물/인쇄물:</strong> 파쇄하거나 소각하여 파기합니다
            </li>
          </ul>
        </section>

        <section id="international-transfer">
          <h2 className="text-lg font-semibold mt-6 mb-2">
            4. 개인정보의 국외 이전
          </h2>
          <p className="text-sm">
            서비스는 다음과 같이 개인정보를 국외로 이전합니다:
          </p>
          <div className="overflow-x-auto mt-2">
            <table className="min-w-full border text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border px-3 py-2 text-left">이전받는 자</th>
                  <th className="border px-3 py-2 text-left">이전 목적</th>
                  <th className="border px-3 py-2 text-left">이전 항목</th>
                  <th className="border px-3 py-2 text-left">이전 국가</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-3 py-2">Google LLC</td>
                  <td className="border px-3 py-2">
                    영수증/보증서 이미지 OCR 텍스트 추출
                  </td>
                  <td className="border px-3 py-2">
                    업로드된 이미지 파일
                  </td>
                  <td className="border px-3 py-2">미국</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2">
                    OpenAI, Inc. / Anthropic, PBC
                  </td>
                  <td className="border px-3 py-2">
                    OCR 텍스트에서 제품 정보 보완 추출
                  </td>
                  <td className="border px-3 py-2">OCR 추출 텍스트</td>
                  <td className="border px-3 py-2">미국</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2">Supabase Inc.</td>
                  <td className="border px-3 py-2">
                    데이터베이스 및 파일 저장소 호스팅
                  </td>
                  <td className="border px-3 py-2">
                    모든 사용자 데이터
                  </td>
                  <td className="border px-3 py-2">미국</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2">Vercel Inc.</td>
                  <td className="border px-3 py-2">
                    웹 애플리케이션 호스팅 및 서버 실행
                  </td>
                  <td className="border px-3 py-2">
                    요청 로그(IP 주소, 접속 일시), 서버 처리 데이터
                  </td>
                  <td className="border px-3 py-2">미국</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-6 mb-2">
            5. 쿠키 사용
          </h2>
          <p className="text-sm">
            서비스는 인증 세션 유지를 위해 쿠키를 사용합니다.
          </p>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>
              <strong>사용 목적:</strong> 로그인 상태 유지 및 사용자 인증
            </li>
            <li>
              <strong>쿠키 유형:</strong> 필수 쿠키 (인증용, 서비스 이용에 반드시
              필요)
            </li>
            <li>
              <strong>거부 방법:</strong> 브라우저 설정에서 쿠키를 차단할 수
              있으나, 이 경우 로그인이 필요한 서비스 이용이 제한됩니다
            </li>
          </ul>
          <p className="text-sm mt-2">
            서비스는 마케팅 또는 분석 목적의 쿠키를 사용하지 않습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-6 mb-2">
            6. 정보주체의 권리 및 행사 방법
          </h2>
          <p className="text-sm">
            이용자는 언제든지 다음 권리를 행사할 수 있습니다:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>개인정보 열람 요구</li>
            <li>개인정보 정정/삭제 요구</li>
            <li>개인정보 처리 정지 요구</li>
            <li>동의 철회 (계정 탈퇴)</li>
          </ul>
          <h3 className="text-base font-medium mt-4 mb-1">행사 방법</h3>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>
              <strong>계정 탈퇴:</strong> 설정 페이지에서 직접 수행 가능하며,
              모든 데이터가 즉시 삭제됩니다
            </li>
            <li>
              <strong>열람/정정/삭제/처리 정지:</strong>{" "}
              개인정보 보호책임자 이메일(bk@bkan.dev)로 요청하시면 10일
              이내에 처리합니다
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-6 mb-2">
            7. 14세 미만 아동의 개인정보
          </h2>
          <p className="text-sm">
            서비스는 만 14세 이상만 이용할 수 있으며, 만 14세 미만 아동의
            개인정보를 수집하지 않습니다. 만 14세 미만임이 확인된 경우 해당
            계정과 개인정보를 지체 없이 파기합니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-6 mb-2">
            8. 개인정보의 안전성 확보 조치
          </h2>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>비밀번호 암호화 저장 (Supabase Auth 자체 암호화)</li>
            <li>
              모든 데이터 전송 시 SSL/TLS 암호화 적용
            </li>
            <li>
              행 수준 보안(RLS) 정책으로 사용자 간 데이터 격리
            </li>
            <li>Storage 파일 사용자별 폴더 격리 및 접근 제어</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-6 mb-2">
            9. 개인정보 처리방침 변경
          </h2>
          <p className="text-sm">
            이 개인정보처리방침은 법령 또는 서비스 변경에 따라 수정될 수
            있으며, 변경 시 서비스 내 공지를 통해 안내합니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-6 mb-2">
            10. 개인정보 보호책임자
          </h2>
          <ul className="list-none pl-0 space-y-1 text-sm">
            <li>성명: 김병관</li>
            <li>직위: 대표</li>
            <li>이메일: bk@bkan.dev</li>
          </ul>
          <p className="text-sm mt-2">
            기타 개인정보 침해 관련 상담은 개인정보침해신고센터(118),
            개인정보분쟁조정위원회(1833-6972)로 문의하실 수 있습니다.
          </p>
        </section>
      </div>

      <div className="mt-8 text-center">
        <Link href="/" className="text-sm text-gray-500 hover:underline">
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
