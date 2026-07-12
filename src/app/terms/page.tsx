import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "이용약관 - ASHD",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold mb-8">이용약관</h1>

      <div className="prose prose-sm max-w-none space-y-6">
        <p className="text-sm text-gray-500">시행일: 2026년 2월 16일</p>

        <section>
          <h2 className="text-lg font-semibold mt-6 mb-2">
            제1조 (목적)
          </h2>
          <p className="text-sm">
            이 약관은 ASHD(이하 &quot;서비스&quot;)의 이용 조건 및 절차, 이용자와
            서비스 제공자의 권리와 의무를 규정하는 것을 목적으로 합니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-6 mb-2">
            제2조 (서비스의 내용)
          </h2>
          <p className="text-sm">서비스는 다음 기능을 제공합니다:</p>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>
              영수증, 보증서 등 문서의 이미지 업로드 및 OCR 기반 텍스트 추출
            </li>
            <li>
              추출된 텍스트로부터 AI(LLM)를 활용한 제품 정보 자동 추출
            </li>
            <li>제품 보증/환불 기한 관리</li>
            <li>기한 임박 시 이메일/텔레그램 알림</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-6 mb-2">
            제3조 (이용자의 의무)
          </h2>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>만 14세 이상만 서비스를 이용할 수 있습니다.</li>
            <li>
              타인의 개인정보 또는 문서를 무단으로 업로드하여서는 안 됩니다.
            </li>
            <li>
              서비스를 불법적인 목적으로 이용하여서는 안 됩니다.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-6 mb-2">
            제4조 (OCR/AI 추출 정확도 면책)
          </h2>
          <p className="text-sm">
            <strong>
              서비스가 제공하는 OCR 및 AI(LLM) 기반 자동 추출 결과는 참고
              목적이며, 100% 정확성을 보장하지 않습니다.
            </strong>
          </p>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>
              OCR 추출 오류, AI 해석 오류, 이미지 품질 저하 등으로 인해
              추출된 정보가 부정확할 수 있습니다.
            </li>
            <li>
              추출된 환불/보증 기한 정보의 부정확으로 인해 이용자가 기한을
              놓치거나 금전적 손해를 입은 경우, 서비스 제공자는 이에 대한
              책임을 지지 않습니다.
            </li>
            <li>
              이용자는 자동 추출된 정보를 반드시 확인하고, 필요 시 수동으로
              수정할 것을 권장합니다.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-6 mb-2">
            제5조 (서비스의 제공 및 변경)
          </h2>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>
              서비스는 무료로 제공되며, 서비스 제공자는 서비스의 지속적인
              제공을 보장하지 않습니다.
            </li>
            <li>
              서비스 내용의 변경 또는 중단 시 사전 공지합니다 (불가피한 경우
              사후 공지).
            </li>
            <li>
              서비스 장애, 점검, 외부 API 장애 등으로 인한 서비스 일시 중단에
              대해 책임을 지지 않습니다.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-6 mb-2">
            제6조 (알림 서비스)
          </h2>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>
              알림은 서비스성 메시지(기한 안내)이며, 마케팅 목적의 광고가
              아닙니다.
            </li>
            <li>
              알림 수신을 원하지 않는 경우 설정 페이지에서 이메일/텔레그램
              알림을 해제할 수 있습니다.
            </li>
            <li>
              네트워크 오류, SMTP/Telegram API 장애 등으로 알림이 발송되지
              않을 수 있으며, 이로 인한 기한 경과에 대해 서비스 제공자는
              책임을 지지 않습니다.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-6 mb-2">
            제7조 (계정 탈퇴)
          </h2>
          <p className="text-sm">
            이용자는 설정 페이지에서 언제든지 계정을 탈퇴할 수 있으며, 탈퇴
            시 모든 개인정보가 즉시 삭제됩니다. 삭제된 데이터는 복구할 수
            없습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-6 mb-2">
            제8조 (약관의 변경)
          </h2>
          <p className="text-sm">
            약관이 변경될 경우 시행일 7일 전부터 서비스 내에 공지하며,
            이용자에게 불리한 변경의 경우 30일 전부터 공지합니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mt-6 mb-2">
            제9조 (문의)
          </h2>
          <p className="text-sm">
            서비스 관련 문의: chillbkan@gmail.com
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
