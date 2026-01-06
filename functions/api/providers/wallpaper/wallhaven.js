// functions/api/wallhaven/wallpaper/index.js
export async function onRequest(context) {
    const {
      request,
      env,
    } = context;

    // 配置项
    // https://wallhaven.cc/help/api#wallpapers
    const config = {
      apiKey: env.WALLHAVEN_API_KEY, // 从环境变量获取
      baseUrl: 'https://wallhaven.cc/api/v1',
      defaultParams: {
        categories: '111',
        purity: '111',
      }
    };
    const randomSorting = ['favorites', 'toplist', 'views', 'random'];
    const randomTopRange = ['1d', '3d', '1w', '1M', '3M', '6M', '1y'];
    try {
      // 获取查询参数
      const url = new URL(request.url);
      const sorting = url.searchParams.get('sorting') || randomSorting[Math.floor(Math.random() * randomSorting.length)];
      const pageRange = url.searchParams.get('pageRange') || '1-1024';
      const categories = url.searchParams.get('categories') || '111';
      const purity = url.searchParams.get('purity') || '111';
      const [start, end] = pageRange.split('-').map(Number);
      const page = Math.floor(Math.random() * (end - start + 1)) + start;
      const q = url.searchParams.get('q') || '';

      const params = new URLSearchParams({
        ...config.defaultParams,
        page: page,
        sorting: sorting,
        categories: categories,
        purity: purity,
        q: q,
      });
      if (sorting === 'toplist') {
        const randomIndex = Math.floor(Math.random() * randomTopRange.length);
        const topRange = randomTopRange[randomIndex];
        params.set('topRange', topRange);
      } else if (sorting === 'random') {
        params.set('seed', Date.now());
      }
      if (config.apiKey) {
        params.set('apikey', config.apiKey);
      }
      // 请求Wallhaven API
      const response = await fetch(`${config.baseUrl}/search?${params}`);

      if (!response.ok) {
        throw new Error(`Wallhaven API error: ${response.status}`);
      }

      // TODO: 逐个fetch后再返回？
      const data = await response.json();

      return new Response(JSON.stringify({
        status: true,
        message: "获取成功\n" + `${config.baseUrl}/search?${params}`,
        data: data.data,
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        }
      });

    } catch (error) {
      return new Response(JSON.stringify({
        status: false,
        message: error.message,
        data: null,
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }
  }