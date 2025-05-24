import { ElMessage } from "element-plus";

const QINIU_DOMAIN = "http://sw6qp9sts.hd-bkt.clouddn.com";
const QINIU_REGION = (window as any).qiniu?.region?.z0;

const tokenCache = {
  token: "",
  expireTime: 0,
};

export const getQiniuToken = async (): Promise<string> => {
  const now = Date.now();
  if (tokenCache.token && tokenCache.expireTime > now + 30000) {
    return tokenCache.token;
  }

  const res = await fetch("https://qiniu-cloud.1464263252.workers.dev/get-qiniu-token");
  const data = await res.json();
  const expireIn = data.expireIn || 3600;
  tokenCache.token = data.token;
  tokenCache.expireTime = now + expireIn * 1000;
  return data.token;
};

export const uploadOneFile = (file: File, key: string, token: string) => {
  return new Promise((resolve, reject) => {
    const observable = (window as any).qiniu.upload(
      file,
      key,
      token,
      {},
      {
        useCdnDomain: true,
        region: QINIU_REGION,
      }
    );

    observable.subscribe({
      next(res) {},
      error(err) {
        reject(err);
      },
      complete(res) {
        resolve(`${QINIU_DOMAIN}/${res.key}`);
      },
    });
  });
};

export const uploadInBatches = async (
  items: File[],
  keys: string[],
  token: string,
  concurrency = 5
) => {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchKeys = keys.slice(i, i + concurrency);
    const promises = batch.map((file, idx) => uploadOneFile(file, batchKeys[idx], token));
    results.push(...(await Promise.allSettled(promises)));
  }
  return results;
};

export const retryUpload = async (file: File, key: string) => {
  const token = await getQiniuToken();
  return uploadOneFile(file, key, token);
};

export const deleteAllFilesInQiniuPrefix = async (prefix: string) => {
  const token = await getQiniuToken();
  const res = await fetch("https://qiniu-cloud.1464263252.workers.dev/delete-prefix", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix, token }),
  });

  if (!res.ok) throw new Error("删除文件失败");
};

export const deleteQiniuFolder = async (folderName: string) => {
  try {
    await deleteAllFilesInQiniuPrefix(`${folderName}/`);
    ElMessage.success("七牛云目录已清空");
  } catch (err) {
    console.error("清空七牛目录失败：", err);
    ElMessage.error("清空七牛目录失败");
  }
};