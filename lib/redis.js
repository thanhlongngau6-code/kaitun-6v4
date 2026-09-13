import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: 'https://enabling-pony-158460.upstash.io',
  token: 'gQAAAAAAAmr8AAIgcDExMDg1ODdhM2VmMTQ0OTIyODI5MzI5OGI0Y2IzYTU3Zg',
});

export default redis;
 
