import type { Metadata } from "next";
import { BUSINESS } from "@/lib/business";
import { ADDON_PAIR, MAX_REVISIONS, PAID_REVISIONS, PRICES, formatWon } from "@/lib/pricing";

export const metadata: Metadata = { title: "환불 정책", alternates: { canonical: "/refund" } };

export default function RefundPage() {
  return (
    <article className="container narrow legal">
      <div className="page-head">
        <h1>환불 정책</h1>
      </div>

      <h2>1. 상품</h2>
      <p>
        Only U song(이하 &ldquo;서비스&rdquo;)의 상품은 아래와 같으며, 모두 이용자 한 사람의 주문에 따라 개별적으로
        만들어지는 디지털 콘텐츠입니다. 가격은 부가가치세 포함입니다.
      </p>
      <ul>
        <li>맞춤 노래 1곡(약 2분 30초 목표, 무제한 듣기·가사 보기·선물 페이지 링크·수정 1회 포함): {formatWon(PRICES.song)}</li>
        <li>MP3 다운로드: {formatWon(PRICES.mp3)}</li>
        <li>가사 카드(선물용 이미지): {formatWon(PRICES.card)}</li>
        <li>MP3 + 가사 카드를 함께 살 때: {formatWon(ADDON_PAIR)} (이후 수정 {MAX_REVISIONS}회 모두 무료)</li>
        <li>올인원(노래 + MP3 + 가사 카드 + 수정 {MAX_REVISIONS}회 무료): {formatWon(PRICES.bundle)}</li>
        <li>추가 수정(노래만 산 경우, 무료 1회 이후 최대 {PAID_REVISIONS}회): 회당 {formatWon(PRICES.revision)}</li>
      </ul>

      <h2>2. 청약철회</h2>
      <ol>
        <li>결제 후 노래가 아직 완성되지 않은 주문은 결제일로부터 7일 이내에 청약철회(결제 취소)를 요청할 수 있으며, 결제 금액 전액을 환불합니다.</li>
        <li>
          노래는 결제 직후 제작이 시작되어 보통 1분 안에 완성·제공됩니다. 이용자의 주문에 따라 개별적으로 만들어지는 디지털
          콘텐츠이므로, 노래가 완성되어 제공된 뒤에는 단순 변심에 의한 청약철회가 제한됩니다(전자상거래 등에서의
          소비자보호에 관한 법률 제17조 제2항). 이 사실은 결제 버튼 위에서 미리 안내하고 동의를 받습니다. 다만 아래 ③의
          경우는 제한 없이 청약철회할 수 있습니다.
        </li>
        <li>
          제공된 노래가 표시·광고의 내용과 다르거나 계약 내용과 다르게 이행된 경우, 위 ①·②와 관계없이 노래를 제공받은
          날부터 3개월 이내, 그 사실을 안 날 또는 알 수 있었던 날부터 30일 이내에 청약철회를 할 수 있으며 결제 금액 전액을
          환불합니다(같은 법 제17조 제3항).
        </li>
      </ol>

      <h2>3. 수정과 재제작</h2>
      <ol>
        <li>
          수정: 같은 이야기 안에서 가사 표현·장르·보컬을 바꿔 다시 만들 수 있습니다. 노래만 산 경우 첫 1회는 무료이고, 이후 최대{" "}
          {PAID_REVISIONS}회까지 회당 {formatWon(PRICES.revision)}입니다. 올인원(노래·MP3·가사 카드를 모두 산 경우)은{" "}
          {MAX_REVISIONS}회 모두 무료입니다. 수정본은 결제(무료 수정은 요청) 직후 만들어
          제공되므로, 제공된 뒤에는 위 2-②에 따라 청약철회가 제한됩니다.
        </li>
        <li>
          재제작: 받는 분의 이름·호칭이 틀렸거나 입력한 추억이 빠지는 등 원래 주문 내용과 다르게 만들어진 경우에는 수정
          횟수와 관계없이 무료로 다시 만들어 드립니다. 재제작을 원하지 않으면 위 2-③에 따라 환불을 받을 수 있습니다.
        </li>
        <li>사연 자체를 바꾸는 것은 수정이 아니라 새 주문입니다.</li>
      </ol>

      <h2>4. 노래를 받지 못한 경우</h2>
      <p>
        결제 후 서비스 장애, AI 제작 실패 등 운영자의 사정으로 노래를 받지 못했다면 추가 결제 없이 다시 만들어 드리며,
        원하시면 결제 금액 전액을 환불합니다.
      </p>

      <h2>5. 미성년자 결제</h2>
      <p>
        미성년자가 법정대리인의 동의 없이 결제한 경우, 본인 또는 법정대리인은 결제를 취소할 수 있습니다. 이 경우 확인을
        위해 가족관계를 증명하는 서류를 요청할 수 있습니다.
      </p>

      <h2>6. 환불 신청 방법</h2>
      <ol>
        <li>아래 이메일 또는 전화로 주문번호, 주문할 때 입력한 이메일, 결제일, 환불 사유를 알려 주세요.</li>
        <li>확인 후 3영업일 이내에 처리하며, 결제한 수단(카드 결제 취소 등)으로 환불합니다. 결제 수단으로 환불할 수 없는 경우 본인 명의 계좌로 환불합니다.</li>
        <li>카드 결제 취소는 카드사 사정에 따라 실제 반영까지 며칠이 더 걸릴 수 있습니다.</li>
        <li>노래 결제가 취소·환불되면 그 주문의 선물 링크는 더 이상 열리지 않습니다. MP3·가사 카드·수정 결제는 건별로 취소할 수 있습니다.</li>
      </ol>

      <h2>7. 부정 이용</h2>
      <p>타인의 결제수단 도용 등 부정 이용이 확인된 경우 환불이 제한되며 관련 법령에 따라 조치할 수 있습니다.</p>

      <p className="legal-meta muted">
        부칙: 이 정책은 2026년 10월 19일부터 시행합니다.
        <br />
        상호: {BUSINESS.name} · 대표자: {BUSINESS.owner} · 사업자등록번호: {BUSINESS.regNo}
        <br />
        문의: {BUSINESS.email} · {BUSINESS.phone}
      </p>
    </article>
  );
}
