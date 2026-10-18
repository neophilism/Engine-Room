import React from 'react';
import {render,screen,within} from '@testing-library/react';
import {describe,it,expect} from 'vitest';
import {PrFacts} from './pr-facts';
describe('primary GitHub facts',()=>{
 it('exposes the owner incident counts without opening planning details',()=>{
  render(<PrFacts repository="neophilism/Galinsky-2028" planned={210} summary={{total:120,open:4,closed:116,merged:111,closedWithoutMerge:5,drafts:1,observedAt:null}}/>);
  for(const [label,count] of [['Open','4'],['Closed','116'],['Merged','111'],['Closed without merge','5']]){
   expect(within(screen.getByText(label).parentElement!).getByRole('link',{name:count})).toBeInTheDocument();
  }
  expect(screen.getByText("Planned PRs").nextSibling).toHaveTextContent("210");
  expect(screen.getByText(/120 total PRs/)).toBeInTheDocument();
 });
 it("shows unknown planning as N/A rather than zero",()=>{
  render(<PrFacts planned={null} summary={{total:0,open:0,closed:0,merged:0,closedWithoutMerge:0,drafts:0,observedAt:null}}/>);
  expect(screen.getByText("Planned PRs").nextSibling).toHaveTextContent("N/A");
 });
});
