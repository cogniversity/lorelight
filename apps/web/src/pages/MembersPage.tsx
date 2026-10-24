import { useQuery } from "@tanstack/react-query";
import { UsersRound, Plus, MoreHorizontal } from "lucide-react";
import api from "../api/client";
import { useSeriesContext } from "../layouts/SeriesLayout";
import { Skeleton } from "../components/Skeleton";

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  joinedAt?: string;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const ROLE_COLORS: Record<string, string> = {
  Administrator: "#5e725f",
  Editor: "#577275",
  Viewer: "#79677d",
  Owner: "#947143",
};

export default function MembersPage() {
  const { seriesId } = useSeriesContext();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members", seriesId],
    queryFn: () =>
      api
        .get<Member[]>(`/api/series/${seriesId}/members`)
        .then((r) => r.data),
    enabled: !!seriesId,
  });

  return (
    <>
      <section className="page-intro compact">
        <div>
          <span className="eyebrow">COLLABORATION</span>
          <h1>Members</h1>
          <p>Manage who has access to this series and their roles.</p>
        </div>
        <button className="primary-button">
          <Plus size={17} />
          Invite member
        </button>
      </section>

      <div className="panel" style={{ overflow: "hidden" }}>
        <div className="data-head">
          <span>NAME & EMAIL</span>
          <span>ROLE</span>
          <span>JOINED</span>
          <span>ACTIONS</span>
        </div>

        {isLoading
          ? [1, 2, 3].map((i) => (
              <div className="data-row" key={i}>
                <span className="entity-main">
                  <Skeleton width={34} height={34} borderRadius="50%" />
                  <span style={{ flex: 1 }}>
                    <Skeleton height={10} width="50%" style={{ marginBottom: 6 }} />
                    <Skeleton height={8} width="70%" />
                  </span>
                </span>
                <span>
                  <Skeleton height={18} width={70} borderRadius={10} />
                </span>
                <span>
                  <Skeleton height={8} width={80} />
                </span>
                <span />
              </div>
            ))
          : members.length === 0
          ? (
            <div style={{ padding: "40px", textAlign: "center" }}>
              <UsersRound
                size={36}
                style={{ color: "#c5bfb3", margin: "0 auto 12px", display: "block" }}
              />
              <p style={{ color: "#999", fontSize: 10, margin: 0 }}>
                No members yet. Invite collaborators to work together on this
                series.
              </p>
            </div>
          )
          : members.map((member) => (
              <div className="data-row" key={member.id}>
                <span className="entity-main">
                  <div
                    className="avatar"
                    style={{ width: 34, height: 34, fontSize: 10 }}
                  >
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: "50%",
                        }}
                      />
                    ) : (
                      initials(member.name)
                    )}
                  </div>
                  <span>
                    <strong style={{ fontSize: 10 }}>{member.name}</strong>
                    <small>{member.email}</small>
                  </span>
                </span>
                <span>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "3px 8px",
                      borderRadius: 10,
                      fontSize: 8,
                      fontFamily: "DM Mono",
                      background: "#f0ede5",
                      color: ROLE_COLORS[member.role] || "#777",
                      border: "1px solid #ddd9cf",
                    }}
                  >
                    {member.role}
                  </span>
                </span>
                <span style={{ fontSize: 8, color: "#999" }}>
                  {member.joinedAt
                    ? new Date(member.joinedAt).toLocaleDateString()
                    : "—"}
                </span>
                <span className="row-actions">
                  <MoreHorizontal size={15} />
                </span>
              </div>
            ))}
      </div>
    </>
  );
}
