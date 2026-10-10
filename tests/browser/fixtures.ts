import {test as base} from '@playwright/test';
export const test=base.extend<{localNetwork:void}>({
  localNetwork:[async({context},use)=>{
    await context.route('**/*',route=>{
      const url=new URL(route.request().url());
      return ['127.0.0.1','localhost','[::1]'].includes(url.hostname)?route.continue():route.abort('blockedbyclient');
    });
    await use();
  },{auto:true}]
});
