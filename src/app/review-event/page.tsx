import type { Metadata } from "next";
import Link from "next/link";
import { BUSINESS } from "@/lib/business";
import { PRICES, formatWon } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "후기 이벤트",
  description: "노래를 처음 듣는 순간을 영상으로 보내 주시면 MP3·가사 카드, 올인원 고객은 다음 노래 1곡을 무료로 드려요.",
  alternates: { canonical: "/review-event" },
};

export default function ReviewEventPage() {
  const channel = BUSINESS.kakaoChannel;
  return (
    <article className="container narrow legal">
      <div className="page-head">
        <h1>🎁 후기 이벤트</h1>
        <p>노래를 선물받은 분이 처음 듣는 순간, 그 표정과 목소리를 저희에게도 나눠 주세요.</p>
      </div>

      <h2>혜택</h2>
      <ul>
        <li>
          <strong>반응 영상 후기</strong> (노래를 처음 듣는 순간)
          <ul>
            <li>
              노래만 구매하신 분 · 오픈 기념 무료로 받으신 분: <strong>MP3 다운로드 + 가사 카드</strong> 무료 ({formatWon(PRICES.mp3 + PRICES.card)} 상당)
            </li>
            <li>
              올인원으로 구매하신 분: <strong>다음 노래 1곡 무료 쿠폰</strong> (노래 듣기 · 선물 링크 포함, MP3·가사 카드 제외, 1년 안에 1번)
            </li>
          </ul>
        </li>
        <li>
          <strong>글·사진 후기</strong>: <strong>가사 카드</strong> 무료 ({formatWon(PRICES.card)} 상당, 이미 가지고 계시면 제외)
        </li>
      </ul>

      <h2>참여 방법</h2>
      <ol>
        <li>노래를 선물받은 분이 처음 듣는 순간을 영상으로 찍어 주세요. 글이나 사진 후기도 좋아요.</li>
        <li>
          {channel ? (
            <>
              <a href={channel}>카카오톡 채널</a>
            </>
          ) : (
            <>이메일({BUSINESS.email})</>
          )}
          로 <strong>주문번호</strong>, 영상(또는 글·사진), 후기에 표시할 이름(예: 김○○님)을 보내 주세요.
        </li>
        <li>확인 후 3영업일 안에 혜택을 드리고 주문할 때 쓴 이메일로 알려 드려요. MP3·가사 카드는 &lsquo;내 노래&rsquo;에서, 쿠폰은 주문 확인 화면에서 쓸 수 있어요.</li>
      </ol>

      <h2>꼭 읽어 주세요</h2>
      <ul>
        <li>좋은 내용이든 아쉬운 내용이든 <strong>솔직한 후기면 똑같이</strong> 혜택을 드려요.</li>
        <li>주문 1건마다 반응 영상 1번, 글·사진 후기 1번 받을 수 있어요. 결제를 취소(환불)하면 혜택도 함께 취소돼요.</li>
        <li>
          후기를 보내 주시면 Only U song <Link href="/stories">후기 코너</Link>와 공식 SNS에 게시하는 데 동의하신 것으로 봐요. 게시할 때는
          &ldquo;혜택을 받고 작성된 후기&rdquo;로 표시해요.
        </li>
        <li>
          영상에 나오는 분(노래를 받은 분 포함) 모두에게 게시 동의를 받아 주세요. 14세 미만이 나오면 보호자 동의가 필요해요. 얼굴을 가리거나
          목소리만 올리기를 원하시면 함께 말씀해 주세요.
        </li>
        <li>게시된 후기는 언제든 삭제를 요청할 수 있어요. 요청하시면 바로 내리고 영상 파일도 지워요.</li>
        <li>후기를 본인 SNS에 올리실 때도 &ldquo;Only U song에서 혜택을 받았어요&rdquo;처럼 혜택을 받았다는 사실을 함께 적어 주세요.</li>
      </ul>

      <p style={{ marginTop: 24 }}>
        <Link href="/stories" className="btn">
          다른 분들 후기 보기
        </Link>
      </p>
    </article>
  );
}
