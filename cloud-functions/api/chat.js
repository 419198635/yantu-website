/**
 * 沿途科技官网 - AI 咨询助手后端
 * EdgeOne Pages Cloud Function
 * 中转调用腾讯混元大模型 API（TC3-HMAC-SHA256 签名）
 */

const crypto = require('crypto');

export default function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method Not Allowed' }, 405);
  }

  return request.json().then(body => handleChat(body)).catch(() => jsonResponse({ error: 'Invalid JSON' }, 400));
}

async function handleChat(body) {
  const { message, history = [] } = body;
  if (!message || typeof message !== 'string') {
    return jsonResponse({ error: '缺少 message 参数' }, 400);
  }

  const secretId  = process.env.HUNYUAN_SECRET_ID || '';
  const secretKey = process.env.HUNYUAN_SECRET_KEY || '';

  // 未配置密钥时返回预设回复
  if (!secretId || !secretKey) {
    return jsonResponse({
      reply: `您好！我是沿途科技的智能助手。🛠️\n\n我们专注于企业级IT全栈运维服务，包括基础设施运维、系统平台运维、应用运维、安全运维等。\n\n您可以描述具体需求，我们的工程师会尽快联系您！`
    });
  }

  const messages = [
    {
      Role: 'system',
      Content: `你是沿途科技（深圳）有限公司的智能咨询助手，公司官网：yantu.online。
主营业务：企业级IT全栈运维服务（基础设施运维、系统平台运维、应用系统运维、数据治理运维、安全运维、IT服务管理）。
公司地址：广州市天河区长兴街白沙水路67号（睿志创意园）
联系邮箱：contact@yantu.net.cn
请友好、专业地回答用户关于IT运维的问题，并适当引导用户留下联系方式。`
    },
    ...history.slice(-10).map(h => ({ Role: h.role === 'user' ? 'user' : 'assistant', Content: h.content })),
    { Role: 'user', Content: message }
  ];

  try {
    const response = await callHunyuan(messages, secretId, secretKey);
    return jsonResponse({ reply: response });
  } catch (err) {
    return jsonResponse({
      reply: `抱歉，AI 服务暂时不可用。您可以发送邮件至 contact@yantu.net.cn，我们的工程师会尽快回复您！`
    });
  }
}

/** 调用腾讯混元 API（TC3 签名） */
async function callHunyuan(messages, secretId, secretKey) {
  const service   = 'hunyuan';
  const host      = 'hunyuan.tencentcloudapi.com';
  const endpoint  = 'https://' + host;
  const region    = 'ap-guangzhou';
  const action    = 'ChatCompletions';
  const version   = '2023-09-01';
  const algorithm = 'TC3-HMAC-SHA256';

  const timestamp = Math.floor(Date.now() / 1000);
  const date      = new Date(timestamp * 1000).toISOString().slice(0, 10);

  const payload = JSON.stringify({ Model: 'hunyuan-lite', Messages: messages });

  // 1. 拼接规范请求串
  const httpRequestMethod = 'POST';
  const canonicalUri    = '/';
  const canonicalQueryString = '';
  const canonicalHeaders = 'content-type:application/json\nhost:' + host + '\n';
  const signedHeaders   = 'content-type;host';
  const hashedRequestPayload = sha256(payload);
  const canonicalRequest  = [
    httpRequestMethod,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    hashedRequestPayload
  ].join('\n');

  // 2. 拼接待签名字符串
  const credentialScope = date + '/' + service + '/tc3_request';
  const hashedCanonicalRequest = sha256(canonicalRequest);
  const stringToSign = [algorithm, timestamp, credentialScope, hashedCanonicalRequest].join('\n');

  // 3. 计算签名
  const kDate    = hmac256(('TC3' + secretKey), date);
  const kService = hmac256(kDate, service);
  const kSigning = hmac256(kService, 'tc3_request');
  const signature = hmac256(kSigning, stringToSign).toString('hex');

  // 4. 拼接 Authorization
  const authorization = [
    algorithm,
    'Credential=' + secretId + '/' + credentialScope + ',',
    'SignedHeaders=' + signedHeaders + ',',
    'Signature=' + signature
  ].join(' ');

  // 5. 发送请求
  const res  = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Host': host,
      'X-TC-Action': action,
      'X-TC-Version': version,
      'X-TC-Region': region,
      'Authorization': authorization,
    },
    body: payload,
  });

  const data = await res.json();
  return data.Response?.Choices?.[0]?.Message?.Content
      || '感谢您的咨询！我们的工程师会尽快与您联系。';
}

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function hmac256(key, msg) {
  return crypto.createHmac('sha256', key).update(msg).digest();
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json; charset=utf-8' }
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
