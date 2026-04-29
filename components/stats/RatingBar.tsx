"use client"

interface RatingBarProps {
  bucket: number
  count: number
  maxBucketCount: number
  animated: boolean
}

export default function RatingBar({
  bucket,
  count,
  maxBucketCount,
  animated,
}: RatingBarProps) {
  const width =
    maxBucketCount > 0 ? `${(count / maxBucketCount) * 100}%` : "0%"

  const background =
    bucket >= 8 ? "#EF9F27" : bucket >= 6 ? "#1D9E75" : "rgba(255,255,255,0.25)"

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "7px",
      }}
    >
      <span
        style={{
          width: "20px",
          fontSize: "12px",
          color: "rgba(255,255,255,0.35)",
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        {bucket}
      </span>

      <div
        style={{
          flex: 1,
          height: "8px",
          borderRadius: "4px",
          background: "rgba(255,255,255,0.06)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: animated ? width : "0%",
            borderRadius: "4px",
            background,
            transition: "width 0.6s ease-out",
          }}
        />
      </div>

      <span
        style={{
          width: "32px",
          fontSize: "11px",
          color: "rgba(255,255,255,0.3)",
          textAlign: "left",
          flexShrink: 0,
        }}
      >
        {count > 0 ? count : ""}
      </span>
    </div>
  )
}
