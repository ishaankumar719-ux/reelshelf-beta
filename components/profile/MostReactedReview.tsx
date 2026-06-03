import type { MostReactedReview as MostReactedReviewType } from "@/utils/profileStats";

export default function MostReactedReview({
  review,
}: {
  review: MostReactedReviewType;
}) {
  return (
    <div className="mx-4 md:mx-0 md:col-span-1 w-full rounded-2xl bg-white/[0.04] p-4 flex flex-col gap-3">
      <p className="text-[10px] font-semibold tracking-widest uppercase text-zinc-500">
        Most Reacted
      </p>

      <div className="flex gap-3 items-start">
        {review.poster && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={`https://image.tmdb.org/t/p/w92${review.poster}`}
            alt={review.title}
            width={36}
            height={54}
            className="rounded-md object-cover flex-shrink-0"
            style={{ width: 36, height: 54 }}
          />
        )}
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-sm font-medium text-zinc-100 truncate">
            {review.title}
          </p>
          <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
            {review.review}
          </p>
        </div>
      </div>

      <p className="text-[11px] text-zinc-600">
        {review.reactionCount}{" "}
        {review.reactionCount === 1 ? "reaction" : "reactions"}
      </p>
    </div>
  );
}
