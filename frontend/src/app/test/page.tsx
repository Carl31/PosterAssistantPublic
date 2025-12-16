type SearchParams = {
  fail?: string;
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  if (params.fail === '1') {
    throw new Error('Forced error');
  }

  return null;
}
