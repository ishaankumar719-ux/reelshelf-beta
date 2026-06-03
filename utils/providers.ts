export function getProviderSearchUrl(providerName: string, title: string): string {
  const encodedTitle = encodeURIComponent(title);
  const normalizedProvider = providerName.toLowerCase().replace(/[^a-z0-9]/g, "");

  switch (true) {
    case normalizedProvider.includes("bbciplayer"):
      return `https://www.bbc.co.uk/iplayer/search?q=${encodedTitle}`;
    case normalizedProvider.includes("netflix"):
      return `https://www.netflix.com/search?q=${encodedTitle}`;
    case normalizedProvider.includes("primevideo") || normalizedProvider.includes("amazonprime"):
      return `https://www.amazon.co.uk/s?k=${encodedTitle}&i=instant-video`;
    case normalizedProvider.includes("disney"):
      return `https://www.disneyplus.com/search?q=${encodedTitle}`;
    case normalizedProvider.includes("appletv"):
      return `https://tv.apple.com/gb/search?q=${encodedTitle}`;
    case normalizedProvider === "now" || normalizedProvider.includes("nowtv"):
      return `https://www.nowtv.com/gb/search?q=${encodedTitle}`;
    case normalizedProvider.includes("skygo") || normalizedProvider === "sky":
      return `https://www.sky.com/search?q=${encodedTitle}`;
    case normalizedProvider.includes("paramount"):
      return `https://www.paramountplus.com/gb/search?q=${encodedTitle}`;
    case normalizedProvider.includes("itvx"):
      return `https://www.itv.com/watch/search?q=${encodedTitle}`;
    case normalizedProvider.includes("channel4"):
      return `https://www.channel4.com/search/?q=${encodedTitle}`;
    case normalizedProvider.includes("youtube"):
      return `https://www.youtube.com/results?search_query=${encodedTitle}`;
    case normalizedProvider.includes("googleplay"):
      return `https://play.google.com/store/search?q=${encodedTitle}&c=movies`;
    case normalizedProvider.includes("rakuten"):
      return `https://rakuten.tv/uk/search?q=${encodedTitle}`;
    default: {
      const encodedProvider = encodeURIComponent(providerName);
      return `https://www.google.com/search?q=${encodedTitle}+watch+${encodedProvider}+UK`;
    }
  }
}
