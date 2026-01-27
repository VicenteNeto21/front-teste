using BackendApi.Dto.ApiarioDTO;

namespace BackendApi.Dto.ProducaoDTO
{
    public class ProducaoApiarioResponseDTO
    {
        public int Id { get; set; }
        public required int ApiarioId { get; set; }
        public decimal TotalProduzidoKg { get; set; }
        public decimal TotalVendido { get; set; }
        public decimal EstoqueAtualKg { get; set; }
        public string? Observacao { get; set; }
        public DateTime CreationDate { get; set; }
    }
}
