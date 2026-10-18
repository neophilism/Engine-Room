// @vitest-environment node
import {describe,it,expect,vi,afterEach} from 'vitest';
const state=vi.hoisted(()=>({query:vi.fn(),release:vi.fn(),connect:vi.fn(),overview:vi.fn(),velocity:vi.fn(),github:vi.fn()}));
vi.mock('./database',()=>({getDatabasePool:()=>({connect:state.connect})}));
vi.mock('./portfolio-overview',()=>({loadPortfolioOverview:state.overview}));
vi.mock('./development-velocity',()=>({loadDevelopmentVelocity:state.velocity}));
vi.mock('./public-github-status',()=>({loadPublicGitHubStatus:state.github}));
import {loadPortfolioSnapshot} from './portfolio-snapshot';
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks();});
describe('coherent portfolio observation',()=>{
 it('reads all counters, velocity and source health through the same repeatable-read client',async()=>{
  vi.stubEnv('DATABASE_URL','postgresql://isolated-test');
  const client={query:state.query,release:state.release};state.connect.mockResolvedValue(client);
  state.query.mockResolvedValue({rows:[]});
  state.overview.mockResolvedValue({source:'database',projects:[],statistics:{}});
  state.velocity.mockResolvedValue({source:'database'});state.github.mockResolvedValue({source:'database'});
  const result=await loadPortfolioSnapshot();
  expect(state.query.mock.calls[0][0]).toBe('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  expect(state.overview).toHaveBeenCalledWith(process.env,client);
  expect(state.velocity).toHaveBeenCalledWith(client);
  expect(state.github).toHaveBeenCalledWith(process.env,client);
  expect(result.overview.observationId).toBe(result.github.observationId);
  expect(state.query).toHaveBeenLastCalledWith('COMMIT');expect(state.release).toHaveBeenCalled();
 });
});
