export function calcCTR(clicks: number, impressions: number) {
  if (impressions <= 0) return 0;
  return (clicks / impressions) * 100;
}
