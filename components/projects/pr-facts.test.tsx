import React from 'react';
import {render,screen,within} from '@testing-library/react';
import {describe,it,expect} from 'vitest';
import {PrFacts} from './pr-facts';
describe('primary GitHub facts',()=>{
 it('exposes the owner incident counts without opening planning details',()=>{
  render(<PrFacts repository="neophilism/Galinsky-2028" summary={{total:120,open:4,closed:116,merged:111,closedWithoutMerge:5,drafts:1,observedAt:null}}/>);
  for(const [label,count] of [['Open','4'],['Closed','116'],['Merged','111'],['Closed without merge','5']]){
   expect(within(screen.getByText(label).parentElement!).getByRole('link',{name:count})).toBeInTheDocument();
  }
  expect(screen.getByText(/120 total PRs/)).toBeInTheDocument();
 });
});
