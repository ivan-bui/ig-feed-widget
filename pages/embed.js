import { useRouter } from 'next/router';
import InstagramFeed from '../components/InstagramFeed';

export default function Embed() {
  const router = useRouter();
  const { limit } = router.query;
  
  // Parse limit: /embed?limit=30 or /embed?limit=all
  let maxPosts = 50; // default
  
  if (limit === 'all') {
    maxPosts = 'all';
  } else if (limit && !isNaN(parseInt(limit))) {
    maxPosts = parseInt(limit);
  }
  
  return <InstagramFeed maxPosts={maxPosts} />;
}